from fastapi import APIRouter

from app.schemas.otp import DetectOtpRequest, DetectOtpResponse
from app.services.otp_detector import detect_otp

router = APIRouter()


@router.post("/detect-otp", response_model=DetectOtpResponse)
def detect_otp_endpoint(payload: DetectOtpRequest) -> DetectOtpResponse:
    otp = detect_otp(payload.message)
    return DetectOtpResponse(detected=otp is not None, otp=otp)
