from fastapi import APIRouter

from schemas.common import HealthResponse
from core.config import settings


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        version=settings.VERSION
    )