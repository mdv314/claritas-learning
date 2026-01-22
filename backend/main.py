import os
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
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5000)