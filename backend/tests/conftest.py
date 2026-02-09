import os
import json
import pytest
import tempfile
import shutil
from unittest.mock import MagicMock, patch

# Set env vars before importing app
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-secret-key")


@pytest.fixture
def temp_course_dir(tmp_path):
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


@pytest.fixture
def mock_supabase():
    """Mock supabase client with chainable methods."""
    mock = MagicMock()

    # Storage for inserted data
    mock._store = []

    def make_chain(data=None, error=None):
        """Create a chainable mock that returns an execute result."""
        chain = MagicMock()
        result = MagicMock()
        result.data = data or []
        result.error = error

        # All chain methods return self for chaining
        chain.eq.return_value = chain
        chain.order.return_value = chain
        chain.execute.return_value = result
        return chain

    mock.table.return_value.select.return_value = make_chain()
    mock.table.return_value.insert.return_value = make_chain()
    mock.table.return_value.update.return_value = make_chain()

    return mock


@pytest.fixture
def client(temp_course_dir, mock_supabase):
    """Create a FastAPI test client with mocked dependencies."""
    from httpx import ASGITransport, AsyncClient

    course_dir, course_id = temp_course_dir

    with patch.dict('sys.modules', {}):
        pass

    # Patch before importing
    with patch('main.supabase', mock_supabase), \
         patch('main.COURSE_PLANS_DIR', str(course_dir)):
        from main import app
        # Also need to patch the module-level variable
        import main
        main.COURSE_PLANS_DIR = str(course_dir)
        main.supabase = mock_supabase

        transport = ASGITransport(app=app)
        return AsyncClient(transport=transport, base_url="http://test"), mock_supabase, course_id
