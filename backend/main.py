import os
import uuid
from datetime import datetime
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from google import genai
from dotenv import load_dotenv
from course_generator import CourseGenerator
from assessment_generator import AssessmentGenerator
from quiz_helper import QuizHelper
from database import supabase
from storage import storage_save, storage_load, ensure_bucket
from fastapi.responses import JSONResponse
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

app = FastAPI()

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

@app.get("/")
@limiter.limit("120/minute")
def root(request: Request):
    return {"message": "works"}

# Ensure Supabase Storage bucket exists at startup
ensure_bucket()

def save_course_plan_locally(course_plan: dict, topic: str) -> str:
    """
    Save a course plan to Supabase Storage.
    Returns the course ID (filename without extension).
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    safe_topic = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in topic)[:50]
    course_id = f"{timestamp}_{safe_topic}_{unique_id}"

    data_to_save = {
        "course_id": course_id,
        "saved_at": datetime.now().isoformat(),
        "course_plan": course_plan
    }

    storage_save(f"{course_id}.json", data_to_save)
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
@limiter.limit("30/minute")
async def generate_text(request: Request, prompt_request: PromptRequest):
    """
    An API endpoint to send a prompt to the Gemini model and receive a response.
    """
    try:
        model_name = "gemini-2.0-flash-exp"
        response = genai_client.models.generate_content(
            model=model_name,
            contents=[prompt_request.prompt],
        )
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_course")
@limiter.limit("30/minute")
async def generate_course_endpoint(
    request: Request,
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
@limiter.limit("120/minute")
async def get_course(request: Request, course_id: str):
    """
    Fetch a saved course plan by its ID.
    """
    data = storage_load(f"{course_id}.json")
    if not data:
        raise HTTPException(status_code=404, detail="Course not found")

    return {"course_id": course_id, **data["course_plan"]}

class TopicRequest(BaseModel):
    courseId: str
    unitNumber: int
    subtopicIndex: int

@app.post("/generate_topic")
@limiter.limit("30/minute")
async def generate_topic(request: Request, topic_request: TopicRequest):
    """
    Generates content for a specific topic within a course.
    """
    try:
        # Load course plan
        course_data = storage_load(f"{topic_request.courseId}.json")
        if not course_data:
            raise HTTPException(status_code=404, detail="Course not found")

        course_plan = course_data["course_plan"]

        # Check if topic content already exists
        topic_filename = f"{topic_request.courseId}_topic_{topic_request.unitNumber}_{topic_request.subtopicIndex}.json"
        cached = storage_load(topic_filename)
        if cached:
            return cached

        # Find the specific unit and subtopic
        units = course_plan.get("units", [])
        unit = next((u for u in units if u.get("unitNumber") == topic_request.unitNumber), None)

        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit {topic_request.unitNumber} not found")

        subtopics = unit.get("subtopics", [])
        if topic_request.subtopicIndex < 0 or topic_request.subtopicIndex >= len(subtopics):
            raise HTTPException(status_code=404, detail="Subtopic not found")

        subtopic_title = subtopics[topic_request.subtopicIndex]

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

        # Save to storage
        storage_save(topic_filename, content)

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
@limiter.limit("30/minute")
def generate_assessment(request: Request, selectedOptions: SelectedOptions):
    try:
        # Generate the full assessment dict
        assessment_dict = assessment_generator.generate_questions(
            subject=selectedOptions.subject,
            grade_level=selectedOptions.gradeLevel
        )

        if "error" in assessment_dict:
            raise HTTPException(status_code=503, detail=assessment_dict["error"])

        return assessment_dict['questions']
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/evaluate_assessment")
@limiter.limit("30/minute")
def evaluate_assessment(request: Request, quiz_attempt: QuizAttempt):
    correct = sum(1 for r in quiz_attempt.results if r.isCorrect)
    total = len(quiz_attempt.results)
    score = round((correct / total) * 100)

    evaluation = assessment_generator.evaluate_quiz(
        subject=quiz_attempt.subject,
        grade_level=quiz_attempt.gradeLevel,
        results_input=[r.model_dump() for r in quiz_attempt.results]
    )

    if "error" in evaluation:
        raise HTTPException(status_code=503, detail=evaluation["error"])

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
    retake: bool = False
    auth_id: Optional[str] = None

@app.post("/generate_module_quiz")
@limiter.limit("30/minute")
async def generate_module_quiz(request: Request, quiz_request: ModuleQuizRequest):
    """Generate or retrieve a cached module-level quiz. Supports adaptive retakes."""
    try:
        course_data = storage_load(f"{quiz_request.courseId}.json")
        if not course_data:
            raise HTTPException(status_code=404, detail="Course not found")

        course_plan = course_data["course_plan"]

        quiz_filename = f"{quiz_request.courseId}_module_quiz_{quiz_request.unitNumber}.json"

        # If not a retake, check cache
        if not quiz_request.retake:
            cached = storage_load(quiz_filename)
            if cached:
                return cached

        # Find the unit
        unit = next((u for u in course_plan.get("units", []) if u.get("unitNumber") == quiz_request.unitNumber), None)
        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit {quiz_request.unitNumber} not found")

        # For retakes, gather weakness data from past attempts
        previous_weakness_data = None
        if quiz_request.retake and quiz_request.auth_id:
            try:
                attempts = supabase.table("quiz_attempts").select("weak_subtopics,percentage").eq(
                    "auth_id", quiz_request.auth_id
                ).eq("course_id", quiz_request.courseId).eq(
                    "unit_number", quiz_request.unitNumber
                ).order("attempt_number", desc=True).limit(3).execute()

                if attempts.data:
                    # Aggregate weak subtopics with frequency
                    subtopic_counts = {}
                    for attempt in attempts.data:
                        for st in attempt.get("weak_subtopics", []):
                            subtopic_counts[st] = subtopic_counts.get(st, 0) + 1
                    if subtopic_counts:
                        previous_weakness_data = {
                            "weak_subtopics": subtopic_counts,
                            "last_score": attempts.data[0].get("percentage", 0)
                        }
            except Exception as e:
                print(f"Warning: Failed to fetch weakness data: {e}")

        result = course_generator.generate_module_quiz(
            course_title=course_plan.get("courseTitle"),
            unit_title=unit.get("title"),
            unit_description=unit.get("description", ""),
            subtopics=unit.get("subtopics", []),
            skill_level=course_plan.get("metadata", {}).get("skillLevel", "Intermediate"),
            age_group=course_plan.get("metadata", {}).get("ageGroup", "Adult"),
            previous_weakness_data=previous_weakness_data
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        storage_save(quiz_filename, result)

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
    auth_id: Optional[str] = None

@app.post("/evaluate_module_quiz")
@limiter.limit("30/minute")
async def evaluate_module_quiz(request: Request, eval_request: EvaluateQuizRequest):
    """Evaluate a student's module quiz answers. MCQ scored locally, FRQ scored by Gemini."""
    try:
        # Load the quiz
        quiz_filename = f"{eval_request.courseId}_module_quiz_{eval_request.unitNumber}.json"
        quiz_data = storage_load(quiz_filename)
        if not quiz_data:
            raise HTTPException(status_code=404, detail="Quiz not found. Generate it first.")

        # Load course plan for metadata
        course_data = storage_load(f"{eval_request.courseId}.json")
        if not course_data:
            raise HTTPException(status_code=404, detail="Course not found")
        course_plan = course_data["course_plan"]

        # Score MCQ
        mcq_questions = quiz_data.get("multipleChoice", [])
        mcq_score = 0
        mcq_results = []
        for i, q in enumerate(mcq_questions):
            selected = eval_request.mcqAnswers[i] if i < len(eval_request.mcqAnswers) else -1
            correct = selected == q.get("correctAnswerIndex")
            if correct:
                mcq_score += 1
            mcq_results.append({
                "question": q["question"],
                "options": q["options"],
                "selectedIndex": selected,
                "correctAnswerIndex": q["correctAnswerIndex"],
                "explanation": q["explanation"],
                "correct": correct,
                "relatedSubtopic": q.get("relatedSubtopic", "")
            })

        # Evaluate FRQ via Gemini
        frq_questions = quiz_data.get("freeResponse", [])
        eval_result = course_generator.evaluate_module_quiz(
            frq_questions=frq_questions,
            frq_answers=eval_request.frqAnswers,
            skill_level=course_plan.get("metadata", {}).get("skillLevel", "Intermediate"),
            age_group=course_plan.get("metadata", {}).get("ageGroup", "Adult")
        )
        print(f"FRQ Evaluation Result: {eval_result}")

        if "error" in eval_result:
            raise HTTPException(status_code=500, detail=eval_result["error"])

        # Calculate scores
        frq_score = sum(e["score"] for e in eval_result.get("frqEvaluations", []))
        frq_total = sum(q.get("maxPoints", 3) for q in frq_questions)
        total_score = mcq_score + frq_score
        total_possible = len(mcq_questions) + frq_total
        percentage = round((total_score / total_possible) * 100, 1) if total_possible > 0 else 0
        passed = percentage >= 80

        # Collect weak subtopics from incorrect answers
        weak_subtopics = []
        for r in mcq_results:
            if not r["correct"] and r["relatedSubtopic"]:
                weak_subtopics.append(r["relatedSubtopic"])
        for i, ev in enumerate(eval_result.get("frqEvaluations", [])):
            if i < len(frq_questions):
                q = frq_questions[i]
                if ev["score"] < ev["maxPoints"] * 0.8 and q.get("relatedSubtopic"):
                    weak_subtopics.append(q["relatedSubtopic"])
        # Deduplicate
        weak_subtopics = list(dict.fromkeys(weak_subtopics))

        # Store results in Supabase if auth_id is provided
        attempt_number = 1
        if eval_request.auth_id:
            try:
                # Get latest attempt number
                existing = supabase.table("quiz_attempts").select("attempt_number").eq(
                    "auth_id", eval_request.auth_id
                ).eq("course_id", eval_request.courseId).eq(
                    "unit_number", eval_request.unitNumber
                ).order("attempt_number", desc=True).limit(1).execute()

                if existing.data:
                    attempt_number = existing.data[0]["attempt_number"] + 1

                frq_evaluations = eval_result.get("frqEvaluations", [])

                supabase.table("quiz_attempts").insert({
                    "auth_id": eval_request.auth_id,
                    "course_id": eval_request.courseId,
                    "unit_number": eval_request.unitNumber,
                    "attempt_number": attempt_number,
                    "mcq_score": mcq_score,
                    "mcq_total": len(mcq_questions),
                    "frq_score": frq_score,
                    "frq_total": frq_total,
                    "total_score": total_score,
                    "total_possible": total_possible,
                    "percentage": percentage,
                    "passed": passed,
                    "mcq_results": mcq_results,
                    "frq_evaluations": frq_evaluations,
                    "weak_subtopics": weak_subtopics,
                    "overall_feedback": eval_result.get("overallFeedback", "")
                }).execute()
                print(f"Quiz attempt #{attempt_number} stored for user {eval_request.auth_id}")
            except Exception as store_err:
                print(f"Warning: Failed to store quiz attempt: {store_err}")
                # Non-blocking: still return results

        return {
            "mcqResults": mcq_results,
            "mcqScore": mcq_score,
            "mcqTotal": len(mcq_questions),
            "frqEvaluations": eval_result.get("frqEvaluations", []),
            "frqQuestions": frq_questions,
            "frqAnswers": eval_request.frqAnswers,
            "frqScore": frq_score,
            "frqTotal": frq_total,
            "totalScore": total_score,
            "totalPossible": total_possible,
            "percentage": percentage,
            "passed": passed,
            "attemptNumber": attempt_number,
            "weakSubtopics": weak_subtopics,
            "overallFeedback": eval_result.get("overallFeedback", "")
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in evaluate_module_quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

################################
# QUIZ ATTEMPTS & STATUS      #
################################

@app.get("/quiz_attempts/{course_id}/{unit_number}")
@limiter.limit("120/minute")
async def get_quiz_attempts(request: Request, course_id: str, unit_number: int, auth_id: str):
    """Return all quiz attempts for a user/course/unit."""
    try:
        result = supabase.table("quiz_attempts").select(
            "attempt_number,percentage,passed,mcq_score,mcq_total,frq_score,frq_total,total_score,total_possible,weak_subtopics,overall_feedback,created_at"
        ).eq("auth_id", auth_id).eq("course_id", course_id).eq(
            "unit_number", unit_number
        ).order("attempt_number", desc=False).execute()
        return {"attempts": result.data}
    except Exception as e:
        print(f"Error fetching quiz attempts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/module_quiz_status/{course_id}")
@limiter.limit("120/minute")
async def get_module_quiz_status(request: Request, course_id: str, auth_id: str):
    """Return per-unit quiz pass/fail status for a course."""
    try:
        result = supabase.table("quiz_attempts").select(
            "unit_number,attempt_number,percentage,passed"
        ).eq("auth_id", auth_id).eq("course_id", course_id).execute()

        # Aggregate per unit
        units_status = {}
        for row in result.data:
            un = row["unit_number"]
            if un not in units_status:
                units_status[un] = {
                    "unitNumber": un,
                    "passed": False,
                    "bestPercentage": 0,
                    "attemptCount": 0
                }
            units_status[un]["attemptCount"] += 1
            if row["percentage"] > units_status[un]["bestPercentage"]:
                units_status[un]["bestPercentage"] = row["percentage"]
            if row["passed"]:
                units_status[un]["passed"] = True

        return {"units": list(units_status.values())}
    except Exception as e:
        print(f"Error fetching quiz status: {e}")
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
@limiter.limit("120/minute")
async def enroll_in_course(request: Request, enroll_request: EnrollRequest):
    """Enroll a user in a course. Reads course JSON to denormalize metadata."""
    print(f"[enroll] auth_id={enroll_request.auth_id}, course_id={enroll_request.course_id}")

    course_data = storage_load(f"{enroll_request.course_id}.json")
    if not course_data:
        raise HTTPException(status_code=404, detail="Course not found")

    print(f"[enroll] course_data top-level keys: {list(course_data.keys())}")
    plan = course_data.get("course_plan", {})
    metadata = plan.get("metadata", {})
    print(f"[enroll] plan keys: {list(plan.keys())}")
    print(f"[enroll] metadata: {metadata}")

    row = {
        "auth_id": enroll_request.auth_id,
        "course_id": enroll_request.course_id,
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
                "auth_id", enroll_request.auth_id
            ).eq("course_id", enroll_request.course_id).execute()
            return {"message": "Already enrolled", "data": existing.data}
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/user/{auth_id}/courses")
@limiter.limit("120/minute")
async def get_user_courses(request: Request, auth_id: str):
    """Return all enrolled courses for a user."""
    result = supabase.table("user_courses").select("*").eq(
        "auth_id", auth_id
    ).order("enrolled_at", desc=True).execute()
    return {"courses": result.data}

@app.post("/update_progress")
@limiter.limit("120/minute")
async def update_progress(request: Request, progress_request: UpdateProgressRequest):
    """Update progress for a user's enrolled course."""
    # Verify enrollment exists
    existing = supabase.table("user_courses").select("id").eq(
        "auth_id", progress_request.auth_id
    ).eq("course_id", progress_request.course_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")

    # Compute is_completed by comparing to total topics AND quiz passes
    is_completed = False
    course_data = storage_load(f"{progress_request.course_id}.json")
    if course_data:
        plan = course_data.get("course_plan", {})
        units = plan.get("units", [])
        total_topics = sum(len(u.get("subtopics", [])) for u in units)
        all_topics_done = total_topics > 0 and len(progress_request.completed_topics) >= total_topics

        # Check if all units have a passing quiz attempt (>=80%)
        all_quizzes_passed = False
        if all_topics_done:
            try:
                quiz_results = supabase.table("quiz_attempts").select(
                    "unit_number,passed"
                ).eq("auth_id", progress_request.auth_id).eq(
                    "course_id", progress_request.course_id
                ).eq("passed", True).execute()

                passed_units = set(r["unit_number"] for r in quiz_results.data)
                all_unit_numbers = set(u.get("unitNumber") for u in units)
                all_quizzes_passed = all_unit_numbers.issubset(passed_units)
            except Exception as e:
                print(f"Warning: Failed to check quiz passes: {e}")

        is_completed = all_topics_done and all_quizzes_passed

    update_data = {
        "completed_topics": progress_request.completed_topics,
        "is_completed": is_completed,
    }
    if progress_request.last_visited is not None:
        update_data["last_visited"] = progress_request.last_visited

    result = supabase.table("user_courses").update(update_data).eq(
        "auth_id", progress_request.auth_id
    ).eq("course_id", progress_request.course_id).execute()

    return {"message": "Progress updated", "data": result.data}


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
@limiter.limit("30/minute")
async def quiz_help_text(request: Request, help_request: QuizHelpTextRequest):
    """Socratic tutor text help for a quiz question."""
    try:
        # Load quiz data
        quiz_filename = f"{help_request.courseId}_module_quiz_{help_request.unitNumber}.json"
        quiz_data = storage_load(quiz_filename)
        if not quiz_data:
            raise HTTPException(status_code=404, detail="Quiz not found")

        # Load course metadata for skill level / age group
        course_data = storage_load(f"{help_request.courseId}.json")
        if not course_data:
            raise HTTPException(status_code=404, detail="Course not found")
        course_plan = course_data["course_plan"]
        skill_level = course_plan.get("metadata", {}).get("skillLevel", "Intermediate")
        age_group = course_plan.get("metadata", {}).get("ageGroup", "Adult")

        # Get the specific question
        if help_request.questionType == "mcq":
            questions = quiz_data.get("multipleChoice", [])
        else:
            questions = quiz_data.get("freeResponse", [])

        if help_request.questionIndex < 0 or help_request.questionIndex >= len(questions):
            raise HTTPException(status_code=404, detail="Question not found")

        question = questions[help_request.questionIndex]

        # Build conversation history as list of dicts
        history = [{"role": msg.role, "text": msg.text} for msg in help_request.conversationHistory]

        response_text = quiz_helper.text_help(
            question=question,
            question_type=help_request.questionType,
            conversation_history=history,
            student_message=help_request.studentMessage,
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
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)