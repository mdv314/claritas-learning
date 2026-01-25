import os
import json
from google import genai
from google.genai import types
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# --- Pydantic Models for Structured Output ---

class Quiz(BaseModel):
    title: str = Field(description="Title of the quiz")
    questionCount: int = Field(description="Number of questions in the quiz")

class Unit(BaseModel):
    unitNumber: int = Field(description="Sequential number of the unit")
    title: str = Field(description="Title of the unit")
    description: str = Field(description="Brief description of what is covered in this unit")
    duration: str = Field(description="Estimated duration to complete the unit")
    subtopics: List[str] = Field(description="List of subtopics covered in this unit")
    quiz: Quiz = Field(description="Quiz associated with this unit")

class CourseMetadata(BaseModel):
    skillLevel: str = Field(description="Target skill level of the course")
    ageGroup: str = Field(description="Target age group for the course")
    estimatedTotalDuration: str = Field(description="Total estimated duration of the course")

class CoursePlan(BaseModel):
    courseTitle: str = Field(description="A catchy and descriptive title for the course")
    description: str = Field(description="A brief overview of what the student will learn")
    metadata: CourseMetadata = Field(description="Metadata about the course")
    units: List[Unit] = Field(description="List of units in the course")

class CourseGenerator:
    def __init__(self):
        try:
            self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
            self.model_name = "gemini-3-flash-preview" 
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
            raise e

    def _load_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'course_plan.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def generate_course(self, topic: str, skill_level: str, age_group: str, 
                       additional_notes: str = "", materials_text: str = "",
                       file_data: bytes = None, mime_type: str = None) -> Dict[str, Any]:
        
        system_template = self._load_prompt()
        
        # Format the prompt with user inputs
        formatted_prompt = system_template.format(
            topic=topic,
            skill_level=skill_level,
            age_group=age_group,
            additional_notes=additional_notes,
            materials_text=materials_text
        )

        contents = [formatted_prompt]

        if file_data and mime_type:
            # Add the file content to the request
            contents.append(
                types.Part.from_bytes(data=file_data, mime_type=mime_type)
            )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': CoursePlan 
                }
            )
            
            # Parse the JSON response
            if response.text:
                print("DEBUG: Gemini Response:", response.text)
                # When using response_schema, the text is a JSON string matching the schema
                return json.loads(response.text)
            else:
                raise ValueError("Empty response from Gemini")

        except Exception as e:
            print(f"Error generating course: {e}")
            # Fallback or error handling
            return {"error": str(e)}
