# backend/routers/photo_generate.py

import base64
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from models.generator import SceneItem, PosePrompt
from schemas.photo import (
    SceneGenerateRequest,
    PoseGenerateRequest,
    CustomGenerateRequest,
    PhotoGenerateResponse,
)
from services.kie_service.kie_services import kie_service
from services.kie_service.translator import translator_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/photo", tags=["Photo generate"])


def _to_base64(img_bytes: bytes) -> str:
    return base64.b64encode(img_bytes).decode("utf-8")


@router.post("/generate/scene", response_model=PhotoGenerateResponse)
async def generate_scene(
    body: SceneGenerateRequest,
    db: Session = Depends(get_db_dependency),
):
    item = db.get(SceneItem, body.item_id)
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail="Scene item not found")

    try:
        result = await kie_service.change_scene(str(body.photo_url), item.prompt)
    except Exception as e:
        logger.exception("Scene generation failed")
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")

    if "image" not in result:
        raise HTTPException(status_code=500, detail="No image in KIE response")

    return PhotoGenerateResponse(image_base64=_to_base64(result["image"]))


@router.post("/generate/pose", response_model=PhotoGenerateResponse)
async def generate_pose(
    body: PoseGenerateRequest,
    db: Session = Depends(get_db_dependency),
):
    prompt_obj = db.get(PosePrompt, body.prompt_id)
    if not prompt_obj or not prompt_obj.is_active:
        raise HTTPException(status_code=404, detail="Pose prompt not found")

    try:
        result = await kie_service.change_pose(str(body.photo_url), prompt_obj.prompt)
    except Exception as e:
        logger.exception("Pose generation failed")
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")

    if "image" not in result:
        raise HTTPException(status_code=500, detail="No image in KIE response")

    return PhotoGenerateResponse(image_base64=_to_base64(result["image"]))


@router.post("/generate/custom", response_model=PhotoGenerateResponse)
async def generate_custom(body: CustomGenerateRequest):
    prompt_text = body.prompt

    if body.translate_to_en:
        try:
            prompt_text = await translator_service.translate_ru_to_en(body.prompt)
        except Exception as e:
            logger.warning(f"Translate failed, using original prompt: {e}")

    try:
        result = await kie_service.custom_generation(str(body.photo_url), prompt_text)
    except Exception as e:
        logger.exception("Custom generation failed")
        raise HTTPException(status_code=500, detail=f"Generation error: {e}")

    if "image" not in result:
        raise HTTPException(status_code=500, detail="No image in KIE response")

    return PhotoGenerateResponse(image_base64=_to_base64(result["image"]))
