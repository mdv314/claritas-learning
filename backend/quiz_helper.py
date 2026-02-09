import os
import json
from google import genai
from google.genai import types
from typing import Dict, Any, List, Optional


class QuizHelper:
    def __init__(self):
        try:
            self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
            self.model_name = "gemini-3-flash-preview"
        except Exception as e:
            print(f"Error initializing Gemini client for QuizHelper: {e}")
            raise e

    def _load_help_prompt(self) -> str:
        prompt_path = os.path.join(os.path.dirname(__file__), 'prompts', 'quiz_help.txt')
        with open(prompt_path, 'r') as f:
            return f.read()

    def _build_question_context(self, question: dict, question_type: str) -> str:
        """Build context string with answers stripped out."""
        if question_type == "mcq":
            return (
                f"Type: Multiple Choice\n"
                f"Question: {question.get('question', '')}\n"
                f"Options:\n" +
                "\n".join(f"  {chr(65 + i)}. {opt}" for i, opt in enumerate(question.get('options', [])))
            )
        elif question_type == "frq":
            return (
                f"Type: Free Response\n"
                f"Question: {question.get('question', '')}\n"
                f"Maximum Points: {question.get('maxPoints', 3)}"
            )
        return f"Question: {question.get('question', '')}"

    def text_help(self, question: dict, question_type: str,
                  conversation_history: List[dict], student_message: str,
                  skill_level: str, age_group: str) -> str:
        """Generate a Socratic help response for a quiz question."""
        prompt_template = self._load_help_prompt()
        question_context = self._build_question_context(question, question_type)

        system_prompt = prompt_template.format(
            skill_level=skill_level,
            age_group=age_group,
            question_context=question_context
        )

        # Build contents with conversation history
        contents = []
        for msg in conversation_history:
            role = msg.get("role", "user")
            text = msg.get("text", "")
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=text)]
            ))

        # Add current student message
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=student_message)]
        ))

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt
                )
            )
            return response.text if response.text else "I'm here to help! Can you tell me what part of this question is confusing you?"
        except Exception as e:
            print(f"Error in text_help: {e}")
            return "Sorry, I'm having trouble right now. Try rephrasing your question!"


