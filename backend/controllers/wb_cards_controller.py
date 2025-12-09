from typing import List
from fastapi import HTTPException
from repositories.wb_repository import WBRepository
from schemas.wb_cards import WBCardUpdateItem


class WBCardsController:
    def __init__(self):
        self.repo = WBRepository()

    async def update_cards(self, cards: List[WBCardUpdateItem]) -> dict:
        if not cards:
            raise HTTPException(status_code=400, detail="Empty cards list")
        payload = [c.model_dump(exclude_none=True) for c in cards]
        try:
            return self.repo.update_cards(payload)
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))
