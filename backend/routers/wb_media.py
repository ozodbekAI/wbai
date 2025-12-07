# routers/wb_media.py
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form
from core.dependencies import get_current_user
from controllers.wb_media_controller import WBMediaController
import json

router = APIRouter(prefix="/wb", tags=["WB - Media"])
controller = WBMediaController()


@router.post("/media/sync")
async def sync_wb_media(
    nmID: int = Form(...),
    finalPhotos: str = Form(..., alias="finalPhotos"),
    files: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user),
):

    try:
        photos = json.loads(finalPhotos)
    except Exception:
        raise ValueError("finalPhotos JSON xato")

    return await controller.sync_media(nm_id=nmID, final_photos=photos, new_files=files)
