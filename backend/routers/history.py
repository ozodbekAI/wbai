# routers/history.py
from typing import List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.database import get_db_dependency
from repositories.history_repository import HistoryRepository
from models.processing_history import ProcessingHistory

router = APIRouter()


class HistoryItem(BaseModel):
    id: int
    nm_id: Optional[int]
    article: Optional[str]
    subject_id: Optional[int]
    subject_name: Optional[str]

    status: str
    validation_score: Optional[int]
    title_score: Optional[int]
    description_score: Optional[int]
    processing_time: Optional[float]

    created_at: datetime

    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[HistoryItem]


class HistoryStatsResponse(BaseModel):
    period_days: int
    total_processed: int
    completed: int
    failed: int
    success_rate: float
    avg_processing_time: float
    avg_validation_score: float


def _get_user_id(current_user: Any) -> int:
    """
    get_current_user nima qaytarsa ham (User modeli yoki dict),
    shu yerda user_id ni olamiz.
    """
    # SQLAlchemy / Pydantic model
    user_id = getattr(current_user, "id", None)

    # dict bo'lsa
    if user_id is None and isinstance(current_user, dict):
        user_id = current_user.get("id") or current_user.get("user_id")

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authenticated user")

    return int(user_id)


@router.get("", response_model=HistoryListResponse)
async def get_history_list(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(get_db_dependency),
    current_user: Any = Depends(get_current_user),
):
    user_id = _get_user_id(current_user)
    repo = HistoryRepository(db)

    items = repo.get_user_history(
        user_id=user_id,
        limit=limit,
        offset=offset,
        status=status,
    )

    # umumiy sonni olish uchun – 1 yil oraliqda
    total_stats = repo.get_statistics(user_id=user_id, days=365)
    total = total_stats["total_processed"]

    return HistoryListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[HistoryItem.model_validate(i) for i in items],
    )


# FRONTEND /api/history/stats ga so‘rov yuboradi
@router.get("/stats", response_model=HistoryStatsResponse)
async def get_history_stats(
    days: int = 30,
    db: Session = Depends(get_db_dependency),
    current_user: Any = Depends(get_current_user),
):
    user_id = _get_user_id(current_user)
    repo = HistoryRepository(db)
    stats = repo.get_statistics(user_id=user_id, days=days)
    return HistoryStatsResponse(**stats)


# Elementni alohida olish – pathni /item/{history_id} qilib o'zgartirdik
@router.get("/item/{history_id}", response_model=HistoryItem)
async def get_history_item(
    history_id: int,
    db: Session = Depends(get_db_dependency),
    current_user: Any = Depends(get_current_user),
):
    user_id = _get_user_id(current_user)

    obj = (
        db.query(ProcessingHistory)
        .filter(
            ProcessingHistory.id == history_id,
            ProcessingHistory.user_id == user_id,
        )
        .first()
    )

    if not obj:
        raise HTTPException(status_code=404, detail="History item not found")

    return HistoryItem.model_validate(obj)
