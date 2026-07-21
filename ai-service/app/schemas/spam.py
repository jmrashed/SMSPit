from pydantic import BaseModel, Field


class DetectSpamRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1600)


class DetectSpamResponse(BaseModel):
    is_spam: bool
    score: float
