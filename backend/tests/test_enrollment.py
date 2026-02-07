import os
import sys
import json
import pytest
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def course_dir(tmp_path):
    """Create a temp directory with a sample course JSON."""
    course_id = "test_course_123"
    course_data = {
        "course_id": course_id,
        "saved_at": "2025-01-01T00:00:00",
        "course_plan": {
            "courseTitle": "Test Course",
            "description": "A test course description",
            "metadata": {
                "skillLevel": "Beginner",
                "ageGroup": "Adult",
                "estimatedTotalDuration": "10 hours"
            },
            "units": [
                {
                    "unitNumber": 1,
                    "title": "Unit 1",
                    "description": "First unit",
                    "duration": "5 hours",
                    "subtopics": ["Topic A", "Topic B"],
                    "quiz": {"title": "Quiz 1", "questionCount": 5}
                },
                {
                    "unitNumber": 2,
                    "title": "Unit 2",
                    "description": "Second unit",
                    "duration": "5 hours",
                    "subtopics": ["Topic C"],
                    "quiz": {"title": "Quiz 2", "questionCount": 3}
                }
            ]
        }
    }

    filepath = tmp_path / f"{course_id}.json"
    with open(filepath, 'w') as f:
        json.dump(course_data, f)

    return tmp_path, course_id


def make_execute_result(data=None, error=None):
    result = MagicMock()
    result.data = data if data is not None else []
    result.error = error
    return result


@pytest.fixture
def app_client(course_dir):
    """Create a test client with mocked supabase."""
    from httpx import ASGITransport, AsyncClient

    course_path, course_id = course_dir
    mock_sb = MagicMock()

    with patch('database.create_client', return_value=mock_sb), \
         patch('main.supabase', mock_sb):
        # Need to reimport to pick up patches
        import main
        main.COURSE_PLANS_DIR = str(course_path)
        main.supabase = mock_sb

        transport = ASGITransport(app=main.app)
        client = AsyncClient(transport=transport, base_url="http://test")
        yield client, mock_sb, course_id


@pytest.mark.asyncio
async def test_enroll_success(app_client):
    client, mock_sb, course_id = app_client

    inserted = [{
        "id": "uuid-1",
        "auth_id": "user-123",
        "course_id": course_id,
        "course_title": "Test Course",
    }]
    chain = MagicMock()
    chain.execute.return_value = make_execute_result(data=inserted)
    mock_sb.table.return_value.insert.return_value = chain

    resp = await client.post("/enroll", json={
        "auth_id": "user-123",
        "course_id": course_id,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "Enrolled successfully"
    assert data["data"][0]["course_title"] == "Test Course"


@pytest.mark.asyncio
async def test_enroll_nonexistent_course(app_client):
    client, mock_sb, course_id = app_client

    resp = await client.post("/enroll", json={
        "auth_id": "user-123",
        "course_id": "nonexistent_course",
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_enroll_duplicate(app_client):
    client, mock_sb, course_id = app_client

    existing = [{
        "id": "uuid-1",
        "auth_id": "user-123",
        "course_id": course_id,
    }]

    # Simulate duplicate key error on insert
    chain_insert = MagicMock()
    chain_insert.execute.side_effect = Exception("duplicate key value violates unique constraint")
    mock_sb.table.return_value.insert.return_value = chain_insert

    # Mock the select fallback
    chain_select = MagicMock()
    chain_select.eq.return_value = chain_select
    chain_select.execute.return_value = make_execute_result(data=existing)
    mock_sb.table.return_value.select.return_value = chain_select

    resp = await client.post("/enroll", json={
        "auth_id": "user-123",
        "course_id": course_id,
    })
    assert resp.status_code == 200
    assert resp.json()["message"] == "Already enrolled"


@pytest.mark.asyncio
async def test_enroll_missing_fields(app_client):
    client, mock_sb, course_id = app_client

    # Missing course_id
    resp = await client.post("/enroll", json={"auth_id": "user-123"})
    assert resp.status_code == 422

    # Missing auth_id
    resp = await client.post("/enroll", json={"course_id": course_id})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_user_courses_empty(app_client):
    client, mock_sb, course_id = app_client

    chain = MagicMock()
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.execute.return_value = make_execute_result(data=[])
    mock_sb.table.return_value.select.return_value = chain

    resp = await client.get("/user/user-123/courses")
    assert resp.status_code == 200
    assert resp.json()["courses"] == []


@pytest.mark.asyncio
async def test_get_user_courses_with_data(app_client):
    client, mock_sb, course_id = app_client

    courses = [
        {"id": "uuid-1", "course_id": "course-a", "course_title": "Course A"},
        {"id": "uuid-2", "course_id": "course-b", "course_title": "Course B"},
    ]
    chain = MagicMock()
    chain.eq.return_value = chain
    chain.order.return_value = chain
    chain.execute.return_value = make_execute_result(data=courses)
    mock_sb.table.return_value.select.return_value = chain

    resp = await client.get("/user/user-123/courses")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["courses"]) == 2


@pytest.mark.asyncio
async def test_update_progress_success(app_client):
    client, mock_sb, course_id = app_client

    # Mock: enrollment exists
    chain_select = MagicMock()
    chain_select.eq.return_value = chain_select
    chain_select.execute.return_value = make_execute_result(data=[{"id": "uuid-1"}])
    mock_sb.table.return_value.select.return_value = chain_select

    # Mock: update succeeds
    chain_update = MagicMock()
    chain_update.eq.return_value = chain_update
    chain_update.execute.return_value = make_execute_result(data=[{"id": "uuid-1", "completed_topics": ["1-0"]}])
    mock_sb.table.return_value.update.return_value = chain_update

    resp = await client.post("/update_progress", json={
        "auth_id": "user-123",
        "course_id": course_id,
        "completed_topics": ["1-0"],
        "last_visited": "1-0",
    })
    assert resp.status_code == 200
    assert resp.json()["message"] == "Progress updated"


@pytest.mark.asyncio
async def test_update_progress_not_enrolled(app_client):
    client, mock_sb, course_id = app_client

    # Mock: enrollment does not exist
    chain_select = MagicMock()
    chain_select.eq.return_value = chain_select
    chain_select.execute.return_value = make_execute_result(data=[])
    mock_sb.table.return_value.select.return_value = chain_select

    resp = await client.post("/update_progress", json={
        "auth_id": "user-123",
        "course_id": course_id,
        "completed_topics": ["1-0"],
        "last_visited": "1-0",
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_progress_marks_completed(app_client):
    client, mock_sb, course_id = app_client

    # Mock: enrollment exists
    chain_select = MagicMock()
    chain_select.eq.return_value = chain_select
    chain_select.execute.return_value = make_execute_result(data=[{"id": "uuid-1"}])
    mock_sb.table.return_value.select.return_value = chain_select

    # Mock: update succeeds
    chain_update = MagicMock()
    chain_update.eq.return_value = chain_update
    chain_update.execute.return_value = make_execute_result(data=[{
        "id": "uuid-1",
        "completed_topics": ["1-0", "1-1", "2-0"],
        "is_completed": True,
    }])
    mock_sb.table.return_value.update.return_value = chain_update

    # All 3 topics in the test course (Topic A, Topic B, Topic C)
    resp = await client.post("/update_progress", json={
        "auth_id": "user-123",
        "course_id": course_id,
        "completed_topics": ["1-0", "1-1", "2-0"],
        "last_visited": "2-0",
    })
    assert resp.status_code == 200

    # Verify the update was called with is_completed=True
    update_call = mock_sb.table.return_value.update.call_args
    if update_call:
        update_data = update_call[0][0]
        assert update_data["is_completed"] is True
