from fastapi import APIRouter

from app.schemas.classify import ClassifyRequest, ClassifyResponse
from app.services.classifier import classify

router = APIRouter()


@router.post("/classify", response_model=ClassifyResponse)
def classify_endpoint(payload: ClassifyRequest) -> ClassifyResponse:
    return ClassifyResponse(category=classify(payload.message))
