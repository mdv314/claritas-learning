import os
import json
import uuid
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from google import genai
from dotenv import load_dotenv
from course_generator import CourseGenerator
from assessment_generator import AssessmentGenerator
from database import supabase
from fastapi.responses import JSONResponse
import easyocr

load_dotenv()

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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

# Initialize generators
course_generator = CourseGenerator()
assessment_generator = AssessmentGenerator()
reader = easyocr.Reader(['en'])

@app.get("/")
def root():
    return {"message": "works"}

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


################################
# ASSESSMENT-RELATED FUNCTIONS #
################################

class SelectedOptions(BaseModel):
    gradeLevel: str = '4th Grade'
    subject: str = 'Chemistry'

class Question(BaseModel):
    id: str
    question: str
    options: list
    correctAnswer: str
    difficulty: str = 'Easy'

class Result(BaseModel):
    question: str
    answer: str
    isCorrect: bool

class QuizAttempt(BaseModel):
    gradeLevel: str = "4th Grade"
    subject: str = 'Chemistry'
    results: List[Result]

class CalibrationResult(BaseModel):
    score: int
    masteryLevel: str
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str

class Assessment(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str

@app.post("/generate_assessment")
def generate_assessment(selectedOptions: SelectedOptions):
    try:
        # Generate the full assessment dict
        assessment_dict = assessment_generator.generate_questions(
            subject=selectedOptions.subject,
            grade_level=selectedOptions.gradeLevel
        )
        
        return assessment_dict['questions']
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/evaluate_assessment")
def evaluate_assessment(quiz_attempt: QuizAttempt):
    correct = sum(1 for r in quiz_attempt.results if r.isCorrect)
    total = len(quiz_attempt.results)
    score = round((correct / total) * 100)

    evaluation = assessment_generator.evaluate_quiz(
        subject=quiz_attempt.subject,
        grade_level=quiz_attempt.gradeLevel,
        results_input=[r.dict() for r in quiz_attempt.results]
    )

    evaluation["score"] = score
    evaluation["masteryLevel"] = mastery_from_score(score)

    return CalibrationResult(**evaluation)

def mastery_from_score(score: int) -> str:
    if score >= 90:
        return "Advanced"
    if score >= 70:
        return "Proficient"
    if score >= 50:
        return "Developing"
    return "Beginner"

##########################
# USER-RELATED FUNCTIONS #
##########################
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
        # 1️⃣ Check if email already exists in Supabase Auth
        try:
            existing_user = supabase.auth.admin.get_user_by_email(user.email)
            if existing_user:
                raise {"message": "User created successfully", "data": 'email'}
        except Exception as e:
            # Supabase may throw if user does not exist; ignore that
            pass

        try:
            auth_response = supabase.auth.admin.create_user({
                "email": user.email,
                "password": user.password,
                "email_confirm": True  # Automatically confirm email
            })
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Supabase service unavailable: {str(e)}")

        if not auth_response or not hasattr(auth_response, "user") or not auth_response.user:
            raise HTTPException(status_code=400, detail="Auth signup failed")

        user_id = auth_response.user.id

        # 3️⃣ Insert profile info into your users table
        db_response = supabase.table("users").insert({
            "auth_id": user_id,
            "name": user.name,
            "email": user.email
        }).execute()

        # 4️⃣ Check for DB errors
        if hasattr(db_response, 'error') and db_response.error:
            raise HTTPException(status_code=500, detail=str(db_response.error))

        return {"message": "User created successfully", "data": db_response.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


class ModuleQuizRequest(BaseModel):
    courseId: str
    unitNumber: int

@app.post("/generate_module_quiz")
async def generate_module_quiz(request: ModuleQuizRequest):
    """Generate or retrieve a cached module-level quiz."""
    try:
        filepath = os.path.join(COURSE_PLANS_DIR, f"{request.courseId}.json")
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Course not found")

        with open(filepath, 'r', encoding='utf-8') as f:
            course_data = json.load(f)
        course_plan = course_data["course_plan"]

        # Check cache
        quiz_filename = f"{request.courseId}_module_quiz_{request.unitNumber}.json"
        quiz_filepath = os.path.join(COURSE_PLANS_DIR, quiz_filename)
        if os.path.exists(quiz_filepath):
            with open(quiz_filepath, 'r', encoding='utf-8') as f:
                return json.load(f)

        # Find the unit
        unit = next((u for u in course_plan.get("units", []) if u.get("unitNumber") == request.unitNumber), None)
        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit {request.unitNumber} not found")

        result = course_generator.generate_module_quiz(
            course_title=course_plan.get("courseTitle"),
            unit_title=unit.get("title"),
            unit_description=unit.get("description", ""),
            subtopics=unit.get("subtopics", []),
            skill_level=course_plan.get("metadata", {}).get("skillLevel", "Intermediate"),
            age_group=course_plan.get("metadata", {}).get("ageGroup", "Adult")
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        with open(quiz_filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in generate_module_quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class EvaluateQuizRequest(BaseModel):
    courseId: str
    unitNumber: int
    mcqAnswers: List[int]
    frqAnswers: List[str]

@app.post("/evaluate_module_quiz")
async def evaluate_module_quiz(request: EvaluateQuizRequest):
    """Evaluate a student's module quiz answers. MCQ scored locally, FRQ scored by Gemini."""
    try:
        # Load the quiz
        quiz_filename = f"{request.courseId}_module_quiz_{request.unitNumber}.json"
        quiz_filepath = os.path.join(COURSE_PLANS_DIR, quiz_filename)
        if not os.path.exists(quiz_filepath):
            raise HTTPException(status_code=404, detail="Quiz not found. Generate it first.")

        with open(quiz_filepath, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)

        # Load course plan for metadata
        filepath = os.path.join(COURSE_PLANS_DIR, f"{request.courseId}.json")
        with open(filepath, 'r', encoding='utf-8') as f:
            course_data = json.load(f)
        course_plan = course_data["course_plan"]

        # Score MCQ
        mcq_questions = quiz_data.get("multipleChoice", [])
        mcq_score = 0
        mcq_results = []
        for i, q in enumerate(mcq_questions):
            selected = request.mcqAnswers[i] if i < len(request.mcqAnswers) else -1
            correct = selected == q.get("correctAnswerIndex")
            if correct:
                mcq_score += 1
            mcq_results.append({
                "question": q["question"],
                "options": q["options"],
                "selectedIndex": selected,
                "correctAnswerIndex": q["correctAnswerIndex"],
                "explanation": q["explanation"],
                "correct": correct
            })

        # Evaluate FRQ via Gemini
        frq_questions = quiz_data.get("freeResponse", [])
        eval_result = course_generator.evaluate_module_quiz(
            frq_questions=frq_questions,
            frq_answers=request.frqAnswers,
            skill_level=course_plan.get("metadata", {}).get("skillLevel", "Intermediate"),
            age_group=course_plan.get("metadata", {}).get("ageGroup", "Adult")
        )
        print(f"FRQ Evaluation Result: {eval_result}")

        if "error" in eval_result:
            raise HTTPException(status_code=500, detail=eval_result["error"])

        # Calculate scores
        frq_score = sum(e["score"] for e in eval_result.get("frqEvaluations", []))
        frq_total = sum(q.get("maxPoints", 3) for q in frq_questions)

        return {
            "mcqResults": mcq_results,
            "mcqScore": mcq_score,
            "mcqTotal": len(mcq_questions),
            "frqEvaluations": eval_result.get("frqEvaluations", []),
            "frqQuestions": frq_questions,
            "frqAnswers": request.frqAnswers,
            "frqScore": frq_score,
            "frqTotal": frq_total,
            "totalScore": mcq_score + frq_score,
            "totalPossible": len(mcq_questions) + frq_total,
            "overallFeedback": eval_result.get("overallFeedback", "")
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in evaluate_module_quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5000)