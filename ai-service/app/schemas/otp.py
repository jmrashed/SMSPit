from pydantic import BaseModel, Field


class DetectOtpRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1600)


class DetectOtpResponse(BaseModel):
    detected: bool
    otp: str | None
