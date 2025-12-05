import json
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from controllers.process_controller import ProcessController
from core.dependencies import get_current_user
from core.database import get_db_dependency
from schemas.process import ProcessRequest

router = APIRouter()
process_controller = ProcessController()


@router.post("")
async def process_article(
    raw_body: dict | str = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_dependency),
):
    if isinstance(raw_body, str):
        try:
            data = json.loads(raw_body)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid JSON in request body",
            )
    else:
        data = raw_body

    article = data.get("article")
    if not article:
        raise HTTPException(status_code=400, detail="Field 'article' is required")

    return StreamingResponse(
        process_controller.process_stream(
            article=article,
            user=current_user,
            db=db,
        ),
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
