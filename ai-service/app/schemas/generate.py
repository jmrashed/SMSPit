from typing import Literal

from pydantic import BaseModel, Field

MessageType = Literal["otp", "transactional", "marketing", "other"]


class GenerateTestDataRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=50)
    type: MessageType | None = None


class GeneratedMessageResponse(BaseModel):
    to: str
    from_: str = Field(..., serialization_alias="from")
    message: str
    type: str


class GenerateTestDataResponse(BaseModel):
    messages: list[GeneratedMessageResponse]
