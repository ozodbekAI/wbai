# backend/models/generated_media.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from core.database import Base  # sizda Base qayerda bo'lsa shuni import qiling

class GeneratedMedia(Base):
    __tablename__ = "generated_media"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    media_type = Column(String(16), nullable=False)  # "image" | "video"
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(1024), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # agar sizda User modeli relationship bilan bo'lsa:
    # user = relationship("User", back_populates="generated_media")
