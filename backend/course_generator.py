import os
import re
import json
import requests
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

class VideoReference(BaseModel):
    title: str = Field(description="Title of the video")
    url: str = Field(description="URL of the video")
    creatorName: str = Field(description="Name of the video creator/channel")

class TopicSection(BaseModel):
    heading: str = Field(description="Section heading")
    content: str = Field(description="Section content in markdown format")
    videos: List[VideoReference] = Field(default=[], description="Videos relevant to this section, selected from provided options")

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

    def _validate_video_url(self, url: str) -> bool:
        """Check if a video URL is valid and accessible."""
        try:
            # For YouTube URLs, use the oEmbed endpoint (fast, no API key needed)
            yt_match = re.search(r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
            if yt_match:
                oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={yt_match.group(1)}&format=json"
                resp = requests.get(oembed_url, timeout=5)
                return resp.status_code == 200
            # For non-YouTube URLs, do a HEAD request
            resp = requests.head(url, timeout=5, allow_redirects=True)
            return resp.status_code < 400
        except Exception:
            return False

    def fetch_videos(self, topic: str, course_title: str = "") -> Dict[str, Any]:
        """Fetch relevant educational videos using Gemini 2.5 Flash with Google Search grounding."""
        search_tool = types.Tool(
            google_search=types.GoogleSearch()
        )

        prompt = f"""Find 3-5 high-quality educational videos about: {topic}
Context: This is for a course called "{course_title}".

For each video, provide the following in this exact format:

**video name:** [title]
**video creator:** [channel/creator name]
**video summary:** [1-2 sentence summary of what the video covers]
**video url:** [full URL]

---

Only include videos that are directly educational and relevant to the topic."""

        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[search_tool]
                )
            )

            videos = []
            if response.text:
                # Parse the structured text response into video dicts
                video_blocks = re.split(r'\n---\n', response.text)
                for block in video_blocks:
                    name_match = re.search(r'\*\*video name:\*\*\s*(.+)', block)
                    creator_match = re.search(r'\*\*video creator:\*\*\s*(.+)', block)
                    url_match = re.search(r'\*\*video url:\*\*\s*(https?://\S+)', block)
                    if name_match and url_match:
                        video_url = url_match.group(1).strip()
                        if self._validate_video_url(video_url):
                            videos.append({
                                "title": name_match.group(1).strip(),
                                "url": video_url,
                                "creatorName": creator_match.group(1).strip() if creator_match else "Unknown"
                            })
                        else:
                            print(f"Skipping unavailable video: {video_url}")

            # Extract Google Search attribution
            search_attribution = ""
            try:
                if (response.candidates and response.candidates[0].grounding_metadata
                        and response.candidates[0].grounding_metadata.search_entry_point):
                    search_attribution = response.candidates[0].grounding_metadata.search_entry_point.rendered_content
            except Exception:
                pass

            return {"videos": videos, "searchAttribution": search_attribution}

        except Exception as e:
            print(f"Error fetching videos: {e}")
            return {"videos": [], "searchAttribution": ""}

    def _load_topic_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'topic_content.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def generate_topic_content(self, course_title: str, unit_title: str, subtopic: str,
                             skill_level: str, age_group: str, additional_context: str = "") -> Dict[str, Any]:

        # Step 1: Fetch relevant videos via grounded search
        video_data = self.fetch_videos(subtopic, course_title)
        available_videos = video_data.get("videos", [])
        search_attribution = video_data.get("searchAttribution", "")

        # Format video list for the prompt
        if available_videos:
            video_list_text = "\n".join(
                f"- Title: {v['title']}, Creator: {v['creatorName']}, URL: {v['url']}"
                for v in available_videos
            )
        else:
            video_list_text = "No videos available."

        system_template = self._load_topic_prompt()

        formatted_prompt = system_template.format(
            course_title=course_title,
            unit_title=unit_title,
            subtopic=subtopic,
            skill_level=skill_level,
            age_group=age_group,
            additional_context=additional_context,
            available_videos=video_list_text
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
                result = json.loads(response.text)
                # Attach search attribution for Google branding
                result["searchAttribution"] = search_attribution
                return result
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
