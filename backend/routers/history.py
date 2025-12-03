from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from core.dependencies import get_current_user
from core.database import get_db_dependency
from repositories.history_repository import HistoryRepository
from schemas.history import HistoryResponse, StatisticsResponse


router = APIRouter()


@router.get("/", response_model=List[HistoryResponse])
async def get_history(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user)
):
    """Get user's processing history"""
    repo = HistoryRepository(db)
    history = repo.get_user_history(
        user_id=current_user["user_id"],
        limit=limit,
        offset=skip,
        status=status
    )
    
    return [
        HistoryResponse(
            id=h.id,
            article=h.article,
            nm_id=h.nm_id,
            subject_name=h.subject_name,
            status=h.status,
            validation_score=h.validation_score,
            title_score=h.title_score,
            description_score=h.description_score,
            processing_time=h.processing_time,
            created_at=h.created_at.isoformat()
        )
        for h in history
    ]


@router.get("/statistics", response_model=StatisticsResponse)
async def get_statistics(
    days: int = 30,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user)
):
    """Get user's processing statistics"""
    repo = HistoryRepository(db)
    stats = repo.get_statistics(
        user_id=current_user["user_id"],
        days=days
    )
    return StatisticsResponse(**stats)


@router.get("/{history_id}", response_model=HistoryResponse)
async def get_history_detail(
    history_id: int,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed history record"""
    repo = HistoryRepository(db)
    history = repo.get_by_id(history_id)
    
    if not history or history.user_id != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="History record not found")
    
    return HistoryResponse(
        id=history.id,
        article=history.article,
        nm_id=history.nm_id,
        subject_name=history.subject_name,
        old_title=history.old_title,
        new_title=history.new_title,
        old_description=history.old_description,
        new_description=history.new_description,
        old_characteristics=history.old_characteristics,
        new_characteristics=history.new_characteristics,
        status=history.status,
        validation_score=history.validation_score,
        title_score=history.title_score,
        description_score=history.description_score,
        iterations_done=history.iterations_done,
        processing_time=history.processing_time,
        detected_colors=history.detected_colors,
        photo_urls=history.photo_urls,
        created_at=history.created_at.isoformat(),
        error_message=history.error_message
    )
