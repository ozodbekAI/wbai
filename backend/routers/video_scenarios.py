# backend/routers/video_scenarios.py

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from repositories.video_scenario_repository import VideoScenarioRepository
from schemas.video import VideoScenarioOut

router = APIRouter(
    prefix="/api/video/scenarios",
    tags=["Photo - Video scenarios"],
)


@router.get("/", response_model=List[VideoScenarioOut])
def get_active_video_scenarios(db: Session = Depends(get_db_dependency)):
    repo = VideoScenarioRepository(db)
    return repo.get_all(only_active=True)
