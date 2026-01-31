import os
import json
from google import genai
from google.genai import types
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from pathlib import Path

# --- Data models ---
class SelectedOptions(BaseModel):
    gradeLevel: str = '4th Grade'
    subject: str = 'Chemistry'

class Question(BaseModel):
    id: str
    question: str
    options: list
    correctAnswer: str
    difficulty: str = 'Easy'

class Questions(BaseModel):
    gradeLevel: str
    subject: str
    questions: List[Question]

# --- Assessment Generator ---
class AssessmentGenerator:
    """Generate self-assessment questions using Gemini 3 Preview."""

    def __init__(self):
        try:
            self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
            self.model_name = "gemini-3-flash-preview" 
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
            raise e

    def _load_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'assessment_content.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def generate_questions(self, subject: str, grade_level: str) -> list[Question]:
        system_template = self._load_prompt()
        
        # Format the prompt with user inputs
        formatted_prompt = system_template.format(
            subject=subject,
            grade_level=grade_level
        )


        print(formatted_prompt)

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[formatted_prompt],
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': Questions
                }
            )
            
            if response.text:
                # print("DEBUG: Gemini Topic Response:", response.text)
                return json.loads(response.text)
            else:
                raise ValueError("Empty response from Gemini")
        except Exception as e:
            print(f"Error generating quiz: {e}")
            return {"error": str(e)}

        response_text = response.text.strip()
        print(response)
        # Clean code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON safely
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            import ast
            data = ast.literal_eval(response_text)

        # Convert to Question objects
        return [
            Question(
                id=f"q{i+1}",
                question=q,
                options=[],
                correctAnswer="",
                explanation="",
                difficulty="Easy"
            )
            for i, q in enumerate(data.get("questions", []))
        ]

    def _validate_response(self, response: dict) -> bool:
        """Validate structure of response."""
        required_keys = {"subject", "grade_level", "questions"}
        if not all(k in response for k in required_keys):
            return False
        questions = response["questions"]
        if not isinstance(questions, list) or len(questions) != 10:
            return False
        for q in questions:
            keys = {"id", "question", "options", "correctAnswer", "difficulty", "explanation"}
            if not all(k in q for k in keys):
                return False
            if not isinstance(q["options"], list) or len(q["options"]) != 4:
                return False
            if q["correctAnswer"] not in q["options"]:
                return False
            if q["difficulty"] not in ["Easy", "Medium", "Hard"]:
                return False
        return True

    def save_to_file(self, questions: dict, filename: str = "assessment.json"):
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"✓ Assessment saved to {filename}")
