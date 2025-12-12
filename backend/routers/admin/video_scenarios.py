# backend/routers/admin/video_scenarios.py

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from repositories.video_scenario_repository import VideoScenarioRepository
from schemas.video import (
    VideoScenarioCreate,
    VideoScenarioUpdate,
    VideoScenarioOut,
)

# Agar admin auth bo'lsa, bu yerga get_current_user va role-check qo'shsa bo'ladi
# hozircha oddiy admin API sifatida qoldiramiz.

router = APIRouter(
    prefix="/api/admin/video-scenarios",
    tags=["Admin - Video scenarios"],
)


@router.get("/", response_model=List[VideoScenarioOut])
def list_scenarios(db: Session = Depends(get_db_dependency)):
    repo = VideoScenarioRepository(db)
    return repo.get_all()


@router.get("/{scenario_id}", response_model=VideoScenarioOut)
def get_scenario(scenario_id: int, db: Session = Depends(get_db_dependency)):
    repo = VideoScenarioRepository(db)
    scenario = repo.get_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Video scenario not found")
    return scenario


@router.post("/", response_model=VideoScenarioOut)
def create_scenario(
    payload: VideoScenarioCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = VideoScenarioRepository(db)
    scenario = repo.add(
        name=payload.name,
        prompt=payload.prompt,
        order_index=payload.order_index,
        is_active=payload.is_active,
    )
    return scenario


@router.put("/{scenario_id}", response_model=VideoScenarioOut)
def update_scenario(
    scenario_id: int,
    payload: VideoScenarioUpdate,
    db: Session = Depends(get_db_dependency),
):
    repo = VideoScenarioRepository(db)
    scenario = repo.update(
        scenario_id=scenario_id,
        name=payload.name,
        prompt=payload.prompt,
        order_index=payload.order_index,
        is_active=payload.is_active,
    )
    if not scenario:
        raise HTTPException(status_code=404, detail="Video scenario not found")
    return scenario


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: int, db: Session = Depends(get_db_dependency)):
    repo = VideoScenarioRepository(db)
    repo.delete(scenario_id)
    return None
