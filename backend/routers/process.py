from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from schemas.process import ProcessRequest
from controllers.process_controller import ProcessController
from core.dependencies import get_current_user


router = APIRouter()
process_controller = ProcessController()


@router.post("")
async def process_article(
    request: ProcessRequest,
    current_user: dict = Depends(get_current_user)
):
    return StreamingResponse(
        process_controller.process_stream(request.article),
        media_type="text/event-stream"
    )