from typing import List, Optional
from pydantic import BaseModel, Field


class WBDimensions(BaseModel):
    length: int
    width: int
    height: int
    weightBrutto: float


class WBCharacteristic(BaseModel):
    id: int
    value: List[str]


class WBSize(BaseModel):
    chrtID: Optional[int] = None
    techSize: Optional[str] = None
    wbSize: Optional[str] = None
    skus: List[str]


class WBCardUpdateItem(BaseModel):
    nmID: int
    vendorCode: str
    brand: Optional[str] = ""
    title: str = Field(..., max_length=60)
    description: str
    dimensions: WBDimensions
    characteristics: List[WBCharacteristic] = []
    sizes: List[WBSize]
