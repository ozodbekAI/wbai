# repositories/history_repository.py
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from models.processing_history import ProcessingHistory


class HistoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_history(
        self,
        user_id: int,
        article: Optional[str] = None,
        nm_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        subject_name: Optional[str] = None,
        old_title: Optional[str] = None,
        new_title: Optional[str] = None,
        old_description: Optional[str] = None,
        new_description: Optional[str] = None,
        old_characteristics: Optional[list] = None,
        new_characteristics: Optional[list] = None,
        validation_score: Optional[int] = None,
        title_score: Optional[int] = None,
        description_score: Optional[int] = None,
        iterations_done: Optional[int] = None,
        best_iteration: Optional[int] = None,
        processing_time: Optional[float] = None,
        detected_colors: Optional[list] = None,
        fixed_data: Optional[Dict[str, Any]] = None,
        photo_urls: Optional[list] = None,
        status: str = "completed",
        error_message: Optional[str] = None,
    ) -> ProcessingHistory:
        history = ProcessingHistory(
            user_id=user_id,
            article=article,
            nm_id=nm_id,
            subject_id=subject_id,
            subject_name=subject_name,
            old_title=old_title,
            new_title=new_title,
            old_description=old_description,
            new_description=new_description,
            old_characteristics=old_characteristics,
            new_characteristics=new_characteristics,
            validation_score=validation_score,
            title_score=title_score,
            description_score=description_score,
            iterations_done=iterations_done,
            best_iteration=best_iteration,
            processing_time=processing_time,
            detected_colors=detected_colors,
            fixed_data=fixed_data,
            photo_urls=photo_urls,
            status=status,
            error_message=error_message,
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_user_history(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> List[ProcessingHistory]:
        query = self.db.query(ProcessingHistory).filter(
            ProcessingHistory.user_id == user_id
        )
        if status:
            query = query.filter(ProcessingHistory.status == status)

        return (
            query.order_by(desc(ProcessingHistory.created_at))
            .limit(limit)
            .offset(offset)
            .all()
        )

    def count_user_history(self, user_id: int, status: Optional[str] = None) -> int:
        query = self.db.query(func.count(ProcessingHistory.id)).filter(
            ProcessingHistory.user_id == user_id
        )
        if status:
            query = query.filter(ProcessingHistory.status == status)
        return query.scalar() or 0

    def get_statistics(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        since = datetime.utcnow() - timedelta(days=days)

        records = (
            self.db.query(ProcessingHistory)
            .filter(
                ProcessingHistory.user_id == user_id,
                ProcessingHistory.created_at >= since,
            )
            .all()
        )

        total = len(records)
        completed = len([r for r in records if r.status == "completed"])
        failed = len([r for r in records if r.status == "failed"])

        avg_time = (
            sum(r.processing_time for r in records if r.processing_time) / total
            if total > 0
            else 0.0
        )
        avg_score = (
            sum(r.validation_score for r in records if r.validation_score) / completed
            if completed > 0
            else 0.0
        )

        return {
            "period_days": days,
            "total_processed": total,
            "completed": completed,
            "failed": failed,
            "success_rate": (completed / total * 100) if total > 0 else 0.0,
            "avg_processing_time": avg_time,
            "avg_validation_score": avg_score,
        }
