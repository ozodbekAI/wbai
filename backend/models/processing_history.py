from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base


class ProcessingHistory(Base):
    __tablename__ = "processing_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Card info
    nm_id = Column(Integer, index=True)
    article = Column(String(100), index=True)
    subject_id = Column(Integer)
    subject_name = Column(String(200))
    
    # Processing results
    old_title = Column(Text)
    new_title = Column(Text)
    old_description = Column(Text)
    new_description = Column(Text)
    old_characteristics = Column(JSON)
    new_characteristics = Column(JSON)
    
    # Metrics
    validation_score = Column(Integer)
    title_score = Column(Integer)
    description_score = Column(Integer)
    iterations_done = Column(Integer)
    best_iteration = Column(Integer)
    processing_time = Column(Float)  # seconds
    
    # Status
    status = Column(String(20), default="completed")  # processing, completed, failed
    error_message = Column(Text)
    
    # Metadata
    detected_colors = Column(JSON)
    fixed_data = Column(JSON)
    photo_urls = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="processing_history")
    
    def __repr__(self):
        return f"<ProcessingHistory(id={self.id}, article={self.article}, status={self.status})>"

