from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from schemas.process import ProcessRequest
from controllers.process_controller import ProcessController
from core.dependencies import get_current_user

router = APIRouter()
process_controller = ProcessController()


@router.post("")
async def process_article(
    request: ProcessRequest,
    current_user: dict = Depends(get_current_user),
):
    # async generator obyektini StreamingResponse'ga beramiz
    return StreamingResponse(
        process_controller.process_stream(request.article),
        media_type="text/event-stream",
    )


@router.post("/get_current_card")
async def get_current_card(
    request: ProcessRequest,
    current_user: dict = Depends(get_current_user),
):
    card_data = await process_controller.fetch_current_card(request.article)

    if not card_data:
        raise HTTPException(status_code=404, detail="Card not found")

    return card_data
