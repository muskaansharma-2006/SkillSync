import os
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SkillSync-GeminiService")

# Load environment variables
load_dotenv()

SYSTEM_INSTRUCTION = """You are the AI Mentor for SkillSync.

Your job is to help candidates understand and improve their demonstrated competencies.

Use the candidate's actual competency data when answering.

Do not invent assessment results.

Do not claim that the candidate has a skill that is not supported by their assessment data.

Identify strengths and weaknesses honestly.

Explain weaknesses constructively.

Give practical and actionable recommendations.

Prioritize practical exercises over generic course recommendations.

When recommending a career or role, explain the evidence and skill gaps behind the recommendation.

Do not make guaranteed career decisions.

If the provided competency data is insufficient to answer a question, clearly say what information is missing rather than inventing it.

Keep responses concise, clear and useful for a student/candidate."""


class GeminiMentorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.is_valid_key = bool(self.api_key and self.api_key != "your_gemini_api_key_here")

    def _format_candidate_context(self, candidate_data: Dict[str, Any]) -> str:
        """Formats candidate competency dictionary into a structured text prompt."""
        overall = candidate_data.get("overallScore", candidate_data.get("overall_score", "N/A"))
        target_role = candidate_data.get("targetRole", candidate_data.get("target_role", "Software Developer"))
        skills = candidate_data.get("skills", {})
        targets = candidate_data.get("targets", {})

        skills_str = "\n".join([
            f"- {skill}: {score}% (Required for {target_role}: {targets.get(skill, 'N/A')}% )" if skill in targets 
            else f"- {skill}: {score}%"
            for skill, score in skills.items()
        ])

        return f"""
CANDIDATE PROFILE CONTEXT:
Target Role: {target_role}
Overall Verified Competency Score: {overall}%

Demonstrated Skill Levels:
{skills_str if skills_str else "- No specific skill breakdown provided"}
"""

    async def generate_mentor_response(self, candidate_data: Dict[str, Any], question: str) -> Dict[str, Any]:
        """Sends candidate context + user question to Google Gemini API."""
        if not self.is_valid_key:
            logger.warning("GEMINI_API_KEY is not configured in backend/.env")
            return {
                "success": False,
                "error": "GEMINI_API_KEY is missing or invalid in backend/.env file. Please add your real Gemini API key to backend/.env to activate the AI Mentor."
            }

        context_str = self._format_candidate_context(candidate_data)
        
        full_prompt = f"""{context_str}

USER CANDIDATE QUESTION:
"{question}"

Answer the user's question directly using their actual competency vector scores shown above. Provide actionable, practical advice for SkillSync."""

        # Try official google-genai SDK first, fallback to google-generativeai
        try:
            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)
                response = client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=full_prompt,
                    config={
                        "system_instruction": SYSTEM_INSTRUCTION,
                        "temperature": 0.3,
                        "max_output_tokens": 800
                    }
                )
                answer_text = response.text
            except ImportError:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                model = genai.GenerativeModel(
                    model_name="gemini-3.6-flash",
                    system_instruction=SYSTEM_INSTRUCTION
                )
                response = model.generate_content(
                    full_prompt,
                    generation_config={"temperature": 0.3, "max_output_tokens": 800}
                )
                answer_text = response.text

            if answer_text:
                return {
                    "success": True,
                    "answer": answer_text.strip()
                }
            else:
                return {
                    "success": False,
                    "error": "Gemini API returned an empty response."
                }

        except Exception as e:
            logger.error(f"Error invoking Gemini API: {str(e)}")
            return {
                "success": False,
                "error": f"Gemini API Error: {str(e)}"
            }

    async def generate_assessment_evaluation(self, assessment_title: str, score_breakdown: Dict[str, float], candidate_name: str = "Candidate") -> Dict[str, Any]:
        """Generates AI insights, strengths, and improvement areas grounded in candidate score breakdown."""
        # Calculate overall score for fallback
        scores = list(score_breakdown.values()) if score_breakdown else [75.0]
        avg_score = round(sum(scores) / len(scores), 1)

        # Default structured fallback
        sorted_skills = sorted(score_breakdown.items(), key=lambda x: x[1], reverse=True) if score_breakdown else []
        fallback_strengths = [
            f"Strong performance in {sorted_skills[0][0]} ({sorted_skills[0][1]}%)" if sorted_skills else "Solid core syntax implementation",
            f"Consistent logical structure in {sorted_skills[1][0]} ({sorted_skills[1][1]}%)" if len(sorted_skills) > 1 else "Good overall code organization"
        ]
        fallback_improvements = [
            f"Further refine edge-case handling in {sorted_skills[-1][0]} ({sorted_skills[-1][1]}%)" if sorted_skills else "Optimize algorithmic space complexity",
            f"Practice advanced error catching in complex functions"
        ]
        fallback_insight = f"Candidate demonstrated {avg_score}% overall mastery across evaluated competencies for {assessment_title}."

        fallback_result = {
            "success": True,
            "ai_insight": fallback_insight,
            "strengths": fallback_strengths,
            "improvement_areas": fallback_improvements
        }

        if not self.is_valid_key:
            logger.warning("GEMINI_API_KEY missing - using rule-based evaluation fallback.")
            return fallback_result

        prompt = f"""
CANDIDATE ASSESSMENT EVALUATION CONTEXT:
Candidate Name: {candidate_name}
Assessment Title: {assessment_title}
Verified Score Breakdown:
{chr(10).join([f'- {skill}: {score}%' for skill, score in score_breakdown.items()])}
Overall Score: {avg_score}%

INSTRUCTIONS:
Generate a concise, professional assessment report for SkillSync in strict JSON format.
Do NOT invent scores. Ground all comments directly in the numerical scores above.

Return strictly JSON with the following schema (no markdown block wrapper around JSON):
{{
  "ai_insight": "A 1-2 sentence overall summary of candidate performance grounded in the scores.",
  "strengths": ["Strength 1 grounded in high scores", "Strength 2 grounded in high scores"],
  "improvement_areas": ["Improvement area 1 grounded in lower scores", "Improvement area 2 grounded in lower scores"]
}}
"""

        try:
            import json
            try:
                from google import genai
                client = genai.Client(api_key=self.api_key)
                response = client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=prompt,
                    config={
                        "system_instruction": "You are SkillSync AI Assessor. Output strictly valid JSON without markdown tags.",
                        "temperature": 0.2,
                        "max_output_tokens": 500
                    }
                )
                text = response.text
            except ImportError:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                model = genai.GenerativeModel(
                    model_name="gemini-3.6-flash",
                    system_instruction="You are SkillSync AI Assessor. Output strictly valid JSON without markdown tags."
                )
                response = model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.2, "max_output_tokens": 500}
                )
                text = response.text

            if text:
                # Clean up any potential markdown backticks
                cleaned_text = text.strip()
                if cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                parsed = json.loads(cleaned_text)
                return {
                    "success": True,
                    "ai_insight": parsed.get("ai_insight", fallback_insight),
                    "strengths": parsed.get("strengths", fallback_strengths),
                    "improvement_areas": parsed.get("improvement_areas", fallback_improvements)
                }
        except Exception as e:
            logger.error(f"Error calling Gemini for assessment evaluation: {str(e)}")

        return fallback_result