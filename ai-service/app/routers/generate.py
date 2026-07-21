from fastapi import APIRouter

from app.schemas.generate import GenerateTestDataRequest, GenerateTestDataResponse
from app.services.test_data_generator import generate_messages

router = APIRouter()


@router.post("/generate-test-data", response_model=GenerateTestDataResponse)
def generate_test_data_endpoint(payload: GenerateTestDataRequest) -> GenerateTestDataResponse:
    messages = generate_messages(payload.count, payload.type)
    return GenerateTestDataResponse(messages=messages)
