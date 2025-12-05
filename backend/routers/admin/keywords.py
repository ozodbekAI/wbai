# routers/admin/keywords.py
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.data_loader import DataLoader

router = APIRouter(
    prefix="/keywords",
    tags=["Admin - Keywords"],
)


class KeywordsResponse(BaseModel):
    values: List[str]
    min: Optional[int] = None
    max: Optional[int] = None


@router.get("/", response_model=KeywordsResponse)
def get_keywords_for_field(
    name: str = Query(..., description="Название характеристики, например: 'Тип ростовки'")
):
    """
    Берilgan name uchun:
    - Ключевые_слова.json dan allowed values
    - Справочник лимитов.json dan min/max cheklovlar
    """
    try:
        allowed_values = DataLoader.build_allowed_values_from_keywords([name])
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    values = allowed_values.get(name, []) or []

    # Limitlarni olish
    try:
        limits = DataLoader.get_limits_for_field(name)
    except FileNotFoundError:
        limits = {}

    # Bu yerda sendagi JSONga moslab ol:
    min_limit = limits.get("min") or limits.get("minCount")
    max_limit = limits.get("max") or limits.get("maxCount")

    # int emas bo'lsa – None
    if not isinstance(min_limit, int):
        min_limit = None
    if not isinstance(max_limit, int):
        max_limit = None

    return KeywordsResponse(
        values=values,
        min=min_limit,
        max=max_limit,
    )
