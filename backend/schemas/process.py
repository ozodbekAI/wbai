from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ProcessRequest(BaseModel):
    article: str = Field(..., min_length=1, description="Article or vendorCode")


class ProcessResponse(BaseModel):
    nmID: Optional[int] = None
    subjectID: Optional[int] = None
    photo_urls: List[str] = []
    old_characteristics: List[Dict[str, Any]] = []
    new_characteristics: List[Dict[str, Any]] = []
    detected_colors: List[str] = []
    validation_score: Optional[int] = None
    validation_issues: List[Any] = []
    iterations_done: int
    best_iteration: int
    wb_description: str
    wb_description_score: int
    wb_title: str
    wb_title_score: int


class LogMessage(BaseModel):
    type: str 
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
