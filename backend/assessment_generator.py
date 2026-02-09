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

class Result(BaseModel):
    question: str
    answer: str
    isCorrect: bool

class Assessment(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str

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

    def _load_prompt(self, filename) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', filename)
        with open(prompt_path, 'r') as f:
            return f.read()

    def generate_questions(self, subject: str, grade_level: str) -> list[Question]:
        system_template = self._load_prompt('assessment_content.txt')
        
        # Format the prompt with user inputs
        formatted_prompt = system_template.format(
            subject=subject,
            grade_level=grade_level
        )

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

    def evaluate_quiz(self, subject: str, grade_level: str, results_input: List[dict]) -> List[Result]:
        """
        Evaluate a student's quiz answers using AI.
        
        Args:
            subject: Subject of the quiz
            grade_level: Grade level
            results_input: List of dicts, each with question, options, and student's answer

        Returns:
            List[Result]: Validated AI evaluation results
        """
        system_template = self._load_prompt('result_content.txt')

        # Replace placeholders in prompt
        formatted_prompt = system_template.format(
            subject=subject,
            grade_level=grade_level,
            results=json.dumps(results_input, indent=2)
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[formatted_prompt],
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': Assessment
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

    def save_to_file(self, questions: dict, filename: str = "assessment.json"):
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"✓ Assessment saved to {filename}")
