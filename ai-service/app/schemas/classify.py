from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["otp", "transactional", "marketing", "other"]


class ClassifyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1600)


class ClassifyResponse(BaseModel):
    category: Category
