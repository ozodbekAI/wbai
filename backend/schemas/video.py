# backend/schemas/video.py

from typing import Optional
from datetime import datetime

from pydantic import BaseModel


class VideoScenarioBase(BaseModel):
    name: str
    prompt: str
    order_index: int = 0
    is_active: bool = True


class VideoScenarioCreate(VideoScenarioBase):
    pass


class VideoScenarioUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class VideoScenarioOut(VideoScenarioBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
