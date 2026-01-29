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

class QuizQuestion(BaseModel):
    question: str = Field(description="The question text")
    options: List[str] = Field(description="List of multiple choice options")
    correctAnswerIndex: int = Field(description="Index of the correct answer (0-based)")
    explanation: str = Field(description="Explanation of why the answer is correct")

class TopicSection(BaseModel):
    heading: str = Field(description="Section heading")
    content: str = Field(description="Section content in markdown format")

class TopicContent(BaseModel):
    title: str = Field(description="Title of the topic/lesson")
    sections: List[TopicSection] = Field(description="Content sections")
    quiz: List[QuizQuestion] = Field(description="Quiz questions for this topic")

class FreeResponseQuestion(BaseModel):
    question: str = Field(description="The free response question prompt")
    sampleAnswer: str = Field(description="A complete sample correct answer")
    keyPoints: List[str] = Field(description="Key points that should be covered in a good answer")
    maxPoints: int = Field(default=3, description="Maximum points for this question")

class ModuleQuizContent(BaseModel):
    title: str = Field(description="Title of the module quiz")
    multipleChoice: List[QuizQuestion] = Field(description="Multiple choice questions (8-12)")
    freeResponse: List[FreeResponseQuestion] = Field(description="Free response questions (2-3)")

class FRQEvaluation(BaseModel):
    questionIndex: int = Field(description="Index of the free response question (0-based)")
    score: int = Field(description="Score awarded (0 to maxPoints)")
    maxPoints: int = Field(description="Maximum possible points")
    feedback: str = Field(description="Detailed feedback explaining what the student got right or wrong")

class QuizEvaluationResult(BaseModel):
    frqEvaluations: List[FRQEvaluation] = Field(description="Evaluation for each free response question")
    overallFeedback: str = Field(description="Overall feedback on the student's performance")

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

    def _load_topic_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'topic_content.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def generate_topic_content(self, course_title: str, unit_title: str, subtopic: str,
                             skill_level: str, age_group: str, additional_context: str = "") -> Dict[str, Any]:
        
        system_template = self._load_topic_prompt()
        
        formatted_prompt = system_template.format(
            course_title=course_title,
            unit_title=unit_title,
            subtopic=subtopic,
            skill_level=skill_level,
            age_group=age_group,
            additional_context=additional_context
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[formatted_prompt],
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': TopicContent
                }
            )
            
            if response.text:
                # print("DEBUG: Gemini Topic Response:", response.text)
                return json.loads(response.text)
            else:
                raise ValueError("Empty response from Gemini")
        except Exception as e:
            print(f"Error generating topic content: {e}")
            return {"error": str(e)}

    def _load_module_quiz_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'module_quiz.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def generate_module_quiz(self, course_title: str, unit_title: str, unit_description: str,
                            subtopics: List[str], skill_level: str, age_group: str) -> Dict[str, Any]:
        system_template = self._load_module_quiz_prompt()
        formatted_prompt = system_template.format(
            course_title=course_title,
            unit_title=unit_title,
            unit_description=unit_description,
            subtopics="\n".join(f"- {s}" for s in subtopics),
            skill_level=skill_level,
            age_group=age_group
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[formatted_prompt],
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': ModuleQuizContent
                }
            )
            if response.text:
                return json.loads(response.text)
            else:
                raise ValueError("Empty response from Gemini")
        except Exception as e:
            print(f"Error generating module quiz: {e}")
            return {"error": str(e)}

    def _load_quiz_evaluation_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'quiz_evaluation.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def evaluate_module_quiz(self, frq_questions: List[Dict], frq_answers: List[str],
                            skill_level: str, age_group: str) -> Dict[str, Any]:
        system_template = self._load_quiz_evaluation_prompt()

        questions_text = ""
        for i, (q, ans) in enumerate(zip(frq_questions, frq_answers)):
            questions_text += f"\n--- Question {i+1} (Max {q['maxPoints']} points) ---\n"
            questions_text += f"Question: {q['question']}\n"
            questions_text += f"Sample Answer: {q['sampleAnswer']}\n"
            questions_text += f"Key Points: {', '.join(q['keyPoints'])}\n"
            questions_text += f"Student's Answer: {ans}\n"

        formatted_prompt = system_template.format(
            questions_text=questions_text,
            skill_level=skill_level,
            age_group=age_group
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[formatted_prompt],
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': QuizEvaluationResult
                }
            )
            if response.text:
                return json.loads(response.text)
            else:
                raise ValueError("Empty response from Gemini")
        except Exception as e:
            print(f"Error evaluating quiz: {e}")
            return {"error": str(e)}
