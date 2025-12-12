from typing import List
from fastapi import APIRouter, Depends, HTTPException
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

@router.patch("/cards/{nm_id}/dimensions")
async def update_card_dimensions(
    nm_id: int,
    dimensions: dict,
    user: dict = Depends(get_current_user),
):
    payload = [{
        "nmID": nm_id,
        "dimensions": {
            "length": int(dimensions.get("length", 0)),
            "width": int(dimensions.get("width", 0)),
            "height": int(dimensions.get("height", 0)),
            "weightBrutto": float(dimensions.get("weightBrutto", 0)),
        }
    }]
    result = controller.repo.update_cards(payload)
    return {"status": "ok", "message": "Габариты обновлены"}