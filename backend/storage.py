import json
from database import supabase

BUCKET_NAME = "course-data"


def ensure_bucket():
    """Create the course-data bucket if it doesn't exist."""
    try:
        supabase.storage.get_bucket(BUCKET_NAME)
    except Exception:
        supabase.storage.create_bucket(BUCKET_NAME, options={"public": False})


def storage_save(filename: str, data: dict) -> None:
    """Upload a JSON dict to Supabase Storage, overwriting if exists."""
    content = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
    supabase.storage.from_(BUCKET_NAME).upload(
        filename,
        content,
        file_options={"content-type": "application/json", "upsert": "true"},
    )


def storage_load(filename: str) -> dict | None:
    """Download and parse a JSON file from Supabase Storage. Returns None if not found."""
    try:
        response = supabase.storage.from_(BUCKET_NAME).download(filename)
        return json.loads(response)
    except Exception:
        return None
