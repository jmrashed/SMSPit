from fastapi import APIRouter

from app.schemas.spam import DetectSpamRequest, DetectSpamResponse
from app.services.spam_detector import is_spam, spam_score

router = APIRouter()


@router.post("/detect-spam", response_model=DetectSpamResponse)
def detect_spam_endpoint(payload: DetectSpamRequest) -> DetectSpamResponse:
    score = spam_score(payload.message)
    return DetectSpamResponse(is_spam=is_spam(payload.message), score=score)
