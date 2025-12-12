# backend/repositories/generated_media_repo.py
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List, Tuple
from models.generated_media import GeneratedMedia

class GeneratedMediaRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, user_id: int, media_type: str, file_name: str, file_url: str) -> GeneratedMedia:
        row = GeneratedMedia(
            user_id=user_id,
            media_type=media_type,
            file_name=file_name,
            file_url=file_url,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete_by_id(self, user_id: int, media_id: int) -> bool:
        row = (
            self.db.query(GeneratedMedia)
            .filter(GeneratedMedia.id == media_id, GeneratedMedia.user_id == user_id)
            .first()
        )
        if not row:
            return False
        self.db.delete(row)
        self.db.commit()
        return True

    def list_paginated(
        self,
        user_id: int,
        limit: int = 20,
        cursor_id: Optional[int] = None,
    ) -> Tuple[List[GeneratedMedia], Optional[int]]:
        q = self.db.query(GeneratedMedia).filter(GeneratedMedia.user_id == user_id)
        # cursor: faqat cursor_id dan kichiklarini olib kelamiz (newest->oldest)
        if cursor_id:
            q = q.filter(GeneratedMedia.id < cursor_id)

        rows = q.order_by(desc(GeneratedMedia.id)).limit(limit + 1).all()

        next_cursor = None
        if len(rows) > limit:
            next_cursor = rows[-1].id
            rows = rows[:limit]

        return rows, next_cursor
