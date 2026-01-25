import os
import json
import uuid
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional, List
from google import genai
from dotenv import load_dotenv
from course_generator import CourseGenerator

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
    Returns the file path of the saved course plan.
    """
    # Create a unique filename using timestamp and UUID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    # Sanitize topic for filename
    safe_topic = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in topic)[:50]
    filename = f"{timestamp}_{safe_topic}_{unique_id}.json"
    filepath = os.path.join(COURSE_PLANS_DIR, filename)

    # Save the course plan with metadata
    data_to_save = {
        "saved_at": datetime.now().isoformat(),
        "course_plan": course_plan
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data_to_save, f, indent=2, ensure_ascii=False)

    return filepath

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
        saved_path = save_course_plan_locally(result, topic)
        print(f"Course plan saved to: {saved_path}")

        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5000)