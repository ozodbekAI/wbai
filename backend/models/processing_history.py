# models/processing_history.py
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    JSON,
    ForeignKey,
    Text,
    Float,
)
from sqlalchemy.orm import relationship

from core.database import Base


class ProcessingHistory(Base):
    __tablename__ = "processing_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    nm_id = Column(Integer, index=True, nullable=True)
    article = Column(String(100), index=True, nullable=True)
    subject_id = Column(Integer, nullable=True)
    subject_name = Column(String(200), nullable=True)

    old_title = Column(Text, nullable=True)
    new_title = Column(Text, nullable=True)
    old_description = Column(Text, nullable=True)
    new_description = Column(Text, nullable=True)
    old_characteristics = Column(JSON, nullable=True)
    new_characteristics = Column(JSON, nullable=True)

    validation_score = Column(Integer, nullable=True)
    title_score = Column(Integer, nullable=True)
    description_score = Column(Integer, nullable=True)
    iterations_done = Column(Integer, nullable=True)
    best_iteration = Column(Integer, nullable=True)
    processing_time = Column(Float, nullable=True)

    status = Column(String(20), default="completed", nullable=False)
    error_message = Column(Text, nullable=True)

    detected_colors = Column(JSON, nullable=True)
    fixed_data = Column(JSON, nullable=True)
    photo_urls = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    user = relationship("User", back_populates="processing_history")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProcessingHistory(id={self.id}, article={self.article}, status={self.status})>"
