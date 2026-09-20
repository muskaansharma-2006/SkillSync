from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import logging

from services.gemini_service import GeminiMentorService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SkillSync-Backend")

app = FastAPI(
    title="SkillSync AI Mentor API",
    description="Backend service providing Gemini AI Mentor intelligence for competency evaluation.",
    version="1.0.0"
)

allowed_origins = [
    "https://skillsync-web.onrender.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Service
gemini_service = GeminiMentorService()


class MentorRequest(BaseModel):
    candidate: Dict[str, Any] = Field(..., description="Structured candidate competency data")
    question: str = Field(..., description="User candidate question")


class MentorResponse(BaseModel):
    success: bool
    answer: Optional[str] = None
    error: Optional[str] = None


class EvaluateRequest(BaseModel):
    assessment_title: str = Field(..., description="Title of the completed assessment")
    score_breakdown: Dict[str, float] = Field(..., description="Breakdown of competency scores")
    candidate_name: Optional[str] = Field("Candidate", description="Name of the candidate")


class EvaluateResponse(BaseModel):
    success: bool
    ai_insight: Optional[str] = None
    strengths: Optional[list] = None
    improvement_areas: Optional[list] = None
    error: Optional[str] = None


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "SkillSync AI Mentor API",
        "gemini_configured": gemini_service.is_valid_key
    }


@app.post("/api/ai/mentor", response_model=MentorResponse)
async def get_mentor_guidance(request: MentorRequest):
    """
    Receives candidate competency context and user question,
    invokes Gemini API securely on the backend, and returns AI guidance.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    logger.info(f"Received Mentor request for question: '{request.question[:60]}...'")

    result = await gemini_service.generate_mentor_response(
        candidate_data=request.candidate,
        question=request.question.strip()
    )

    if not result.get("success"):
        logger.error(f"Mentor guidance generation failed: {result.get('error')}")
        return MentorResponse(
            success=False,
            error="AI service is temporarily unavailable. Please try again."
        )

    return MentorResponse(
        success=True,
        answer=result.get("answer")
    )


@app.post("/api/ai/evaluate", response_model=EvaluateResponse)
async def evaluate_assessment(request: EvaluateRequest):
    """
    Evaluates candidate assessment performance scores using backend Gemini model.
    Returns AI insight summary, strengths, and areas for improvement.
    """
    logger.info(f"Received Evaluation request for assessment: '{request.assessment_title}'")

    result = await gemini_service.generate_assessment_evaluation(
        assessment_title=request.assessment_title,
        score_breakdown=request.score_breakdown,
        candidate_name=request.candidate_name or "Candidate"
    )

    return EvaluateResponse(
        success=result.get("success", True),
        ai_insight=result.get("ai_insight"),
        strengths=result.get("strengths", []),
        improvement_areas=result.get("improvement_areas", [])
    )


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

