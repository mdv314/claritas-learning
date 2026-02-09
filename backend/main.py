import os
import json
import uuid
import asyncio
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from google import genai
from dotenv import load_dotenv
from course_generator import CourseGenerator
from assessment_generator import AssessmentGenerator
from quiz_helper import QuizHelper
from database import supabase
from fastapi.responses import JSONResponse
import easyocr
import jwt

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
quiz_helper = QuizHelper()
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
class Preferences(BaseModel):
    role: str
    education: str
    grade: str
    state: str
    traits: str
    style: str

def get_auth_id(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = jwt.decode(token, os.environ["SUPABASE_SECRET_KEY"], algorithms=["HS256"], audience="authenticated")
    return payload["sub"]

@app.post("update_user_preferences")
def update_user_prefs(request: Request, prefs: Preferences):
    token = request.cookies.get("access_token")
    print(token)
    return {'success': 200}

@app.get("/get_user_info")
def get_user_info():
    return {'success': 200}

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

################################
# ENROLLMENT & PROGRESS       #
################################

class EnrollRequest(BaseModel):
    auth_id: str
    course_id: str

class UpdateProgressRequest(BaseModel):
    auth_id: str
    course_id: str
    completed_topics: List[str]
    last_visited: Optional[str] = None

@app.post("/enroll")
async def enroll_in_course(request: EnrollRequest):
    """Enroll a user in a course. Reads course JSON to denormalize metadata."""
    print(f"[enroll] auth_id={request.auth_id}, course_id={request.course_id}")

    filepath = os.path.join(COURSE_PLANS_DIR, f"{request.course_id}.json")
    print(f"[enroll] looking for file: {filepath}")
    print(f"[enroll] file exists: {os.path.exists(filepath)}")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Course not found")

    with open(filepath, 'r', encoding='utf-8') as f:
        course_data = json.load(f)

    print(f"[enroll] course_data top-level keys: {list(course_data.keys())}")
    plan = course_data.get("course_plan", {})
    metadata = plan.get("metadata", {})
    print(f"[enroll] plan keys: {list(plan.keys())}")
    print(f"[enroll] metadata: {metadata}")

    row = {
        "auth_id": request.auth_id,
        "course_id": request.course_id,
        "course_title": plan.get("courseTitle", "Untitled"),
        "course_description": plan.get("description", ""),
        "skill_level": metadata.get("skillLevel", ""),
        "age_group": metadata.get("ageGroup", ""),
        "estimated_duration": metadata.get("estimatedTotalDuration", ""),
    }
    print(f"[enroll] inserting row: {row}")

    try:
        result = supabase.table("user_courses").insert(row).execute()
        print(f"[enroll] insert success: {result.data}")
        return {"message": "Enrolled successfully", "data": result.data}
    except Exception as e:
        error_msg = str(e)
        print(f"[enroll] insert error: {error_msg}")
        import traceback
        traceback.print_exc()
        if "duplicate" in error_msg.lower() or "unique" in error_msg.lower() or "23505" in error_msg:
            # Already enrolled - return existing record
            existing = supabase.table("user_courses").select("*").eq(
                "auth_id", request.auth_id
            ).eq("course_id", request.course_id).execute()
            return {"message": "Already enrolled", "data": existing.data}
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/user/{auth_id}/courses")
async def get_user_courses(auth_id: str):
    """Return all enrolled courses for a user."""
    result = supabase.table("user_courses").select("*").eq(
        "auth_id", auth_id
    ).order("enrolled_at", desc=True).execute()
    return {"courses": result.data}

@app.post("/update_progress")
async def update_progress(request: UpdateProgressRequest):
    """Update progress for a user's enrolled course."""
    # Verify enrollment exists
    existing = supabase.table("user_courses").select("id").eq(
        "auth_id", request.auth_id
    ).eq("course_id", request.course_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")

    # Compute is_completed by comparing to total topics in course JSON
    is_completed = False
    filepath = os.path.join(COURSE_PLANS_DIR, f"{request.course_id}.json")
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            course_data = json.load(f)
        plan = course_data.get("course_plan", {})
        total_topics = sum(len(u.get("subtopics", [])) for u in plan.get("units", []))
        if total_topics > 0 and len(request.completed_topics) >= total_topics:
            is_completed = True

    update_data = {
        "completed_topics": request.completed_topics,
        "is_completed": is_completed,
    }
    if request.last_visited is not None:
        update_data["last_visited"] = request.last_visited

    result = supabase.table("user_courses").update(update_data).eq(
        "auth_id", request.auth_id
    ).eq("course_id", request.course_id).execute()

    return {"message": "Progress updated", "data": result.data}


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

################################
# QUIZ HELP (SOCRATIC TUTOR)  #
################################

class ConversationMessage(BaseModel):
    role: str  # "user" or "model"
    text: str

class QuizHelpTextRequest(BaseModel):
    courseId: str
    unitNumber: int
    questionIndex: int
    questionType: str  # "mcq" or "frq"
    conversationHistory: List[ConversationMessage]
    studentMessage: str

@app.post("/quiz_help/text")
async def quiz_help_text(request: QuizHelpTextRequest):
    """Socratic tutor text help for a quiz question."""
    try:
        # Load quiz data
        quiz_filename = f"{request.courseId}_module_quiz_{request.unitNumber}.json"
        quiz_filepath = os.path.join(COURSE_PLANS_DIR, quiz_filename)
        if not os.path.exists(quiz_filepath):
            raise HTTPException(status_code=404, detail="Quiz not found")

        with open(quiz_filepath, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)

        # Load course metadata for skill level / age group
        course_filepath = os.path.join(COURSE_PLANS_DIR, f"{request.courseId}.json")
        if not os.path.exists(course_filepath):
            raise HTTPException(status_code=404, detail="Course not found")

        with open(course_filepath, 'r', encoding='utf-8') as f:
            course_data = json.load(f)
        course_plan = course_data["course_plan"]
        skill_level = course_plan.get("metadata", {}).get("skillLevel", "Intermediate")
        age_group = course_plan.get("metadata", {}).get("ageGroup", "Adult")

        # Get the specific question
        if request.questionType == "mcq":
            questions = quiz_data.get("multipleChoice", [])
        else:
            questions = quiz_data.get("freeResponse", [])

        if request.questionIndex < 0 or request.questionIndex >= len(questions):
            raise HTTPException(status_code=404, detail="Question not found")

        question = questions[request.questionIndex]

        # Build conversation history as list of dicts
        history = [{"role": msg.role, "text": msg.text} for msg in request.conversationHistory]

        response_text = quiz_helper.text_help(
            question=question,
            question_type=request.questionType,
            conversation_history=history,
            student_message=request.studentMessage,
            skill_level=skill_level,
            age_group=age_group
        )

        return {"response": response_text}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in quiz_help_text: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))






if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5000)