from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class HistoryResponse(BaseModel):
    id: int
    article: Optional[str]
    nm_id: Optional[int]
    subject_name: Optional[str]
    old_title: Optional[str] = None
    new_title: Optional[str] = None
    old_description: Optional[str] = None
    new_description: Optional[str] = None
    old_characteristics: Optional[List[Dict[str, Any]]] = None
    new_characteristics: Optional[List[Dict[str, Any]]] = None
    status: str
    validation_score: Optional[int]
    title_score: Optional[int]
    description_score: Optional[int]
    iterations_done: Optional[int] = None
    processing_time: Optional[float]
    detected_colors: Optional[List[str]] = None
    photo_urls: Optional[List[str]] = None
    created_at: str
    error_message: Optional[str] = None


class StatisticsResponse(BaseModel):
    period_days: int
    total_processed: int
    completed: int
    failed: int
    success_rate: float
    avg_processing_time: float
    avg_validation_score: float