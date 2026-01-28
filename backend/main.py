import os
import json
import uuid
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from google import genai
from dotenv import load_dotenv
from course_generator import CourseGenerator
from database import supabase

load_dotenv()

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    genai_client = genai.Client()
except Exception as e:
    print(f"Error configuring Gemini client: {e}")
    # Continue execution, but warn
    print("Please ensure your GEMINI_API_KEY is set in your .env file or environment variables.")

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY")
)

# Initialize CourseGenerator
course_generator = CourseGenerator()

# Directory to store course plans locally
COURSE_PLANS_DIR = os.path.join(os.path.dirname(__file__), "course_plans")
os.makedirs(COURSE_PLANS_DIR, exist_ok=True)

def save_course_plan_locally(course_plan: dict, topic: str) -> str:
    """
    Save a course plan to a local JSON file.
    Returns the course ID (filename without extension).
    """
    # Create a unique filename using timestamp and UUID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    # Sanitize topic for filename - replace spaces with underscores, remove special chars
    safe_topic = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in topic)[:50]
    course_id = f"{timestamp}_{safe_topic}_{unique_id}"
    filename = f"{course_id}.json"
    filepath = os.path.join(COURSE_PLANS_DIR, filename)

    # Save the course plan with metadata
    data_to_save = {
        "course_id": course_id,
        "saved_at": datetime.now().isoformat(),
        "course_plan": course_plan
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data_to_save, f, indent=2, ensure_ascii=False)

    return course_id

@app.get('/')
def index():
    response = supabase.table('todos').select("*").execute()
    todos = response.data
    return {"todos": todos} # Return JSON for FastAPI

# Define Pydantic models
class PromptRequest(BaseModel):
    prompt: str

class CourseGenerationRequest(BaseModel):
    topic: str
    skill_level: str
    age_group: str
    additional_notes: Optional[str] = ""
    materials_text: Optional[str] = ""

@app.post("/generate")
async def generate_text(request: PromptRequest):
    """
    An API endpoint to send a prompt to the Gemini model and receive a response.
    """
    try:
        model_name = "gemini-2.0-flash-exp"
        response = genai_client.models.generate_content(
            model=model_name,
            contents=[request.prompt],
        )
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_course")
async def generate_course_endpoint(
    topic: str = Form(...),
    skill_level: str = Form(...),
    age_group: str = Form(...),
    additional_notes: str = Form(""),
    materials_text: str = Form(""),
    file: UploadFile = File(None)
):
    """
    Endpoint to generate a structured course plan, supporting optional file upload.
    """
    try:
        file_data = None
        mime_type = None
        if file:
            file_data = await file.read()
            mime_type = file.content_type

        result = course_generator.generate_course(
            topic=topic,
            skill_level=skill_level,
            age_group=age_group,
            additional_notes=additional_notes,
            materials_text=materials_text,
            file_data=file_data,
            mime_type=mime_type
        )

        # Save the course plan locally for future use
        course_id = save_course_plan_locally(result, topic)
        print(f"Course plan saved with ID: {course_id}")

        # Return course data with ID
        return {"course_id": course_id, **result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/course/{course_id}")
async def get_course(course_id: str):
    """
    Fetch a saved course plan by its ID.
    """
    filepath = os.path.join(COURSE_PLANS_DIR, f"{course_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Course not found")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Return the course plan with its ID
    return {"course_id": course_id, **data["course_plan"]}

class TopicRequest(BaseModel):
    courseId: str
    unitNumber: int
    subtopicIndex: int

@app.post("/generate_topic")
async def generate_topic(request: TopicRequest):
    """
    Generates content for a specific topic within a course.
    """
    try:
        # Load course plan
        filepath = os.path.join(COURSE_PLANS_DIR, f"{request.courseId}.json")
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Course not found")
            
        with open(filepath, 'r', encoding='utf-8') as f:
            course_data = json.load(f)
            
        course_plan = course_data["course_plan"]
        
        # Check if topic content already exists
        topic_filename = f"{request.courseId}_topic_{request.unitNumber}_{request.subtopicIndex}.json"
        topic_filepath = os.path.join(COURSE_PLANS_DIR, topic_filename)
        
        if os.path.exists(topic_filepath):
            with open(topic_filepath, 'r', encoding='utf-8') as f:
                return json.load(f)

        # Find the specific unit and subtopic
        units = course_plan.get("units", [])
        unit = next((u for u in units if u.get("unitNumber") == request.unitNumber), None)
        
        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit {request.unitNumber} not found")
            
        subtopics = unit.get("subtopics", [])
        if request.subtopicIndex < 0 or request.subtopicIndex >= len(subtopics):
            raise HTTPException(status_code=404, detail="Subtopic not found")
            
        subtopic_title = subtopics[request.subtopicIndex]
        
        # Generate content
        content = course_generator.generate_topic_content(
            course_title=course_plan.get("courseTitle"),
            unit_title=unit.get("title"),
            subtopic=subtopic_title,
            skill_level=course_plan.get("metadata", {}).get("skillLevel", "Intermediate"),
            age_group=course_plan.get("metadata", {}).get("ageGroup", "Adult"),
            additional_context=course_plan.get("description", "")
        )
        
        if "error" in content:
            raise HTTPException(status_code=500, detail=content["error"])
            
        # Save locally
        with open(topic_filepath, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
            
        return content

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in generate_topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# USER-RELATED FUNCTIONS #
class User(BaseModel):
    name: str
    email: EmailStr
    password: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Alice",
                "email": "alice@example.com",
                "password": "securePassword123"
            }
        }
    }

@app.post("/create_user")
def create_user(user: User):
    try:
        # Check if email exists
        try:
            existing_user = supabase.auth.api.get_user_by_email(user.email)
        except Exception:
            existing_user = None  # Supabase may fail if maintenance
        if existing_user is not None:
            raise HTTPException(status_code=400, detail="Email is already registered")

        # Create user in Supabase Auth
        try:
            auth_response = supabase.auth.sign_up({
                "email": user.email,
                "password": user.password
            })
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Supabase service unavailable: {str(e)}")

        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="Auth signup failed")

        user_id = auth_response.user.id

        # Insert profile info into users table
        try:
            db_response = supabase.table("users").insert({
                "id": user_id,
                "name": user.name,
                "email": user.email
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Supabase DB unavailable: {str(e)}")

        if db_response.error:
            raise HTTPException(status_code=500, detail=db_response.error.message)

        return {"message": "User created successfully", "data": db_response.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@app.post("/login")
def login(login: LoginRequest):
    try:
        # Sign in using Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": login.email,
            "password": login.password
        })

        # Check if login was successful
        if auth_response.user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Return the access token to the frontend
        access_token = auth_response.session.access_token
        refresh_token = auth_response.session.refresh_token

        return {
            "message": "Login successful",
            "user_id": auth_response.user.id,
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    except Exception as e:
        # Handles network or Supabase errors
        raise HTTPException(status_code=503, detail=f"Supabase service unavailable: {str(e)}")

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5000)