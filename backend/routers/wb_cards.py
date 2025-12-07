from typing import List
from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from controllers.wb_cards_controller import WBCardsController
from schemas.wb_cards import WBCardUpdateItem

router = APIRouter(prefix="/wb", tags=["WB - Cards"])
controller = WBCardsController()


@router.post("/cards/update")
async def update_wb_cards(
    cards: List[WBCardUpdateItem],
    user: dict = Depends(get_current_user),
):
    return await controller.update_cards(cards)
