from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import classify, generate, health, otp, spam

app = FastAPI(title="SMSPit AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin] if settings.cors_origin != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(otp.router)
app.include_router(classify.router)
app.include_router(spam.router)
app.include_router(generate.router)
