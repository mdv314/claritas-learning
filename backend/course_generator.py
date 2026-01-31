import os
import json
from google import genai
from google.genai import types
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from pathlib import Path

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

class AssessmentGenerator:
    """Generate self-assessment questions using Gemini AI."""
    
    def __init__(self, api_key: str = None, prompt_file: str = "assessment_content.txt"):
        """
        Initialize the Assessment Generator.
        
        Args:
            api_key: Google API key for Gemini. If None, reads from GEMINI_API_KEY env var
            prompt_file: Path to the file containing the prompt template
        """
        # Get API key
        if api_key is None:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError(
                    "API key not provided. Set GEMINI_API_KEY environment variable "
                    "or pass api_key parameter."
                )
        
        # Initialize the client
        self.client = genai.Client(api_key=api_key)
        
        # Load prompt template
        self.prompt_template = self._load_prompt(prompt_file)
    
    def _load_prompt(self, prompt_file: str) -> str:
        """Load the prompt template from file."""
        prompt_path = Path(prompt_file)
        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
        
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def generate_questions(self, subject: str, grade_level: str) -> dict:
        """
        Generate 10 self-assessment questions for the given subject and grade level.
        
        Args:
            subject: The subject area (e.g., "Mathematics", "Science", "History")
            grade_level: The grade level (e.g., "5th Grade", "High School", "Grade 8")
        
        Returns:
            Dictionary containing the generated questions in JSON format
        
        Raises:
            ValueError: If the response is not valid JSON
            Exception: For API errors or other issues
        """
        # Create the full prompt by adding subject and grade level
        full_prompt = f"{self.prompt_template}\n\nSUBJECT: {subject}\nGRADE_LEVEL: {grade_level}"
        
        try:
            # Generate content using the new API
            response = self.client.models.generate_content(
                model='gemini-1.5-flash',
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=2048,
                    response_mime_type="application/json",  # Request JSON response
                )
            )
            
            # Extract text from response
            response_text = response.text.strip()
            
            # Clean up response (remove markdown code blocks if present)
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            result = json.loads(response_text)
            
            # Validate structure
            if not self._validate_response(result):
                raise ValueError("Response does not match expected format")
            
            return result
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON response: {e}\nResponse: {response_text}")
        except Exception as e:
            raise Exception(f"Error generating questions: {e}")
    
    def _validate_response(self, response: dict) -> bool:
        """Validate that the response has the expected structure."""
        required_keys = {"subject", "grade_level", "questions"}
        
        if not all(key in response for key in required_keys):
            return False
        
        if not isinstance(response["questions"], list):
            return False
        
        if len(response["questions"]) != 10:
            return False
        
        # Validate each question has the required structure
        for i, question in enumerate(response["questions"], 1):
            required_question_keys = {"id", "question", "options", "correctAnswer", "difficulty", "explanation"}
            
            if not all(key in question for key in required_question_keys):
                return False
            
            # Validate options is a list with 4 items
            if not isinstance(question["options"], list) or len(question["options"]) != 4:
                return False
            
            # Validate correctAnswer is in options
            if question["correctAnswer"] not in question["options"]:
                return False
            
            # Validate difficulty
            if question["difficulty"] not in ["Easy", "Medium", "Hard"]:
                return False
        
        return True
    
    def save_to_file(self, questions: dict, filename: str = "assessment.json"):
        """
        Save generated questions to a JSON file.
        
        Args:
            questions: The questions dictionary to save
            filename: Output filename
        """
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Assessment saved to {filename}")
    """Generate self-assessment questions using Gemini AI."""
    
    def __init__(self, api_key: str = None, prompt_file: str = "assessment_content.txt"):
        """
        Initialize the Assessment Generator.
        
        Args:
            api_key: Google API key for Gemini. If None, reads from GEMINI_API_KEY env var
            prompt_file: Path to the file containing the prompt template
        """
        # Configure API key
        if api_key is None:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError(
                    "API key not provided. Set GEMINI_API_KEY environment variable "
                    "or pass api_key parameter."
                )
        
        genai.configure(api_key=api_key)
        
        # Initialize the model (using gemini-1.5-flash for speed and efficiency)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Load prompt template
        self.prompt_template = self._load_prompt(prompt_file)
    
    def _load_prompt(self, prompt_file: str) -> str:
        """Load the prompt template from file."""
        prompt_path = Path(prompt_file)
        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
        
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def generate_questions(self, subject: str, grade_level: str) -> dict:
        """
        Generate 10 self-assessment questions for the given subject and grade level.
        
        Args:
            subject: The subject area (e.g., "Mathematics", "Science", "History")
            grade_level: The grade level (e.g., "5th Grade", "High School", "Grade 8")
        
        Returns:
            Dictionary containing the generated questions in JSON format
        
        Raises:
            ValueError: If the response is not valid JSON
            Exception: For API errors or other issues
        """
        # Create the full prompt by adding subject and grade level
        full_prompt = f"{self.prompt_template}\n\nSUBJECT: {subject}\nGRADE_LEVEL: {grade_level}"
        
        try:
            # Generate content
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,  # Balanced creativity
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=2048,
                )
            )
            
            # Extract text from response
            response_text = response.text.strip()
            
            # Clean up response (remove markdown code blocks if present)
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            result = json.loads(response_text)
            
            # Validate structure
            if not self._validate_response(result):
                raise ValueError("Response does not match expected format")
            
            return result
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON response: {e}\nResponse: {response_text}")
        except Exception as e:
            raise Exception(f"Error generating questions: {e}")
    
    def _validate_response(self, response: dict) -> bool:
        """Validate that the response has the expected structure."""
        required_keys = {"subject", "grade_level", "questions"}
        
        if not all(key in response for key in required_keys):
            return False
        
        if not isinstance(response["questions"], list):
            return False
        
        if len(response["questions"]) != 10:
            return False
        
        # Validate each question has the required structure
        for i, question in enumerate(response["questions"], 1):
            required_question_keys = {"id", "question", "options", "correctAnswer", "difficulty", "explanation"}
            
            if not all(key in question for key in required_question_keys):
                return False
            
            # Validate options is a list with 4 items
            if not isinstance(question["options"], list) or len(question["options"]) != 4:
                return False
            
            # Validate correctAnswer is in options
            if question["correctAnswer"] not in question["options"]:
                return False
            
            # Validate difficulty
            if question["difficulty"] not in ["Easy", "Medium", "Hard"]:
                return False
        
        return True
    
    def save_to_file(self, questions: dict, filename: str = "assessment.json"):
        """
        Save generated questions to a JSON file.
        
        Args:
            questions: The questions dictionary to save
            filename: Output filename
        """
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Assessment saved to {filename}")