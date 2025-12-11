# backend/routers/photo_generator.py (FINAL – KIE bilan 100% mos)

import base64
import logging
from typing import Optional
from urllib.parse import urlparse, urljoin
import os

from fastapi import (
    APIRouter, HTTPException, Depends, Request,
    Response, UploadFile, File
)
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db_dependency
from models.generator import ModelItem, SceneItem, PosePrompt
from schemas.photo import (
    NormalizeNewModelRequest, NormalizeOwnModelRequest,
    SceneGenerateRequest, PoseGenerateRequest,
    CustomGenerateRequest, EnhancePhotoRequest,
    UploadPhotoResponse, VideoGenerateRequest,
    PhotoGenerateResponse, VideoGenerateResponse,
)
from services.kie_service.kie_services import kie_service
from services.kie_service.translator import translator_service
from services.media_storage import (
    save_generated_file, get_file_url,
    delete_generated_file, get_public_file_url
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/photo", tags=["Photo generate"])




def _to_base64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("utf-8")


def normalize_photo_url(request: Request, photo_url: str) -> str:
    """
    KIE API uchun **faqat tashqi HTTP(S) URL** qaytaradi.
    """

    if not photo_url:
        raise HTTPException(status_code=400, detail="photo_url is required")

    photo_url = str(photo_url).strip()

    # 1) blob URL – QABUL QILINMAYDI
    if photo_url.startswith("blob:"):
        raise HTTPException(
            status_code=400,
            detail="blob: URL not supported. Upload the file first."
        )

    # 2) http/https bo‘lsa → shu holicha ishlaydi
    parsed = urlparse(photo_url)
    if parsed.scheme in ("http", "https"):
        return photo_url

    # 3) /media/... bo‘lsa → PUBLIC URL yasaymiz
    if photo_url.startswith("/media/"):
        return f"{settings.PUBLIC_BASE_URL}{photo_url}"

    # 4) media/<folder> variantlari
    if photo_url.startswith("media/"):
        return f"{settings.PUBLIC_BASE_URL}/{photo_url}"

    # 5) boshqa relative pathlar
    return urljoin(settings.PUBLIC_BASE_URL + "/", photo_url.lstrip("/"))


# ----------------------
# SCENE
# ----------------------

@router.post("/generate/scene", response_model=PhotoGenerateResponse)
async def generate_scene(
    body: SceneGenerateRequest,
    request: Request,
    db: Session = Depends(get_db_dependency),
):
    item = db.get(SceneItem, body.item_id)
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail="Scene item not found")

    image_url = normalize_photo_url(request, body.photo_url)

    result = await kie_service.change_scene(image_url, item.prompt)

    if "image" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return image")

    raw = result["image"]
    file_name = save_generated_file(raw, kind="image")

    return PhotoGenerateResponse(
        image_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# POSE
# ----------------------

@router.post("/generate/pose", response_model=PhotoGenerateResponse)
async def generate_pose(
    body: PoseGenerateRequest,
    request: Request,
    db: Session = Depends(get_db_dependency),
):
    prompt_obj = db.get(PosePrompt, body.prompt_id)
    if not prompt_obj or not prompt_obj.is_active:
        raise HTTPException(status_code=404, detail="Pose prompt not found")

    image_url = normalize_photo_url(request, body.photo_url)

    result = await kie_service.change_pose(image_url, prompt_obj.prompt)

    if "image" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return image")

    raw = result["image"]
    file_name = save_generated_file(raw, kind="image")

    return PhotoGenerateResponse(
        image_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# CUSTOM
# ----------------------

@router.post("/generate/custom", response_model=PhotoGenerateResponse)
async def generate_custom(
    body: CustomGenerateRequest,
    request: Request,
):
    prompt = body.prompt

    if body.translate_to_en:
        try:
            prompt = await translator_service.translate_ru_to_en(prompt)
        except:
            pass

    image_url = normalize_photo_url(request, body.photo_url)

    result = await kie_service.custom_generation(image_url, prompt)

    if "image" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return image")

    raw = result["image"]
    file_name = save_generated_file(raw, kind="image")

    return PhotoGenerateResponse(
        image_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# ENHANCE
# ----------------------

@router.post("/generate/enhance", response_model=PhotoGenerateResponse)
async def enhance_photo(
    body: EnhancePhotoRequest,
    request: Request,
):
    image_url = normalize_photo_url(request, body.photo_url)

    result = await kie_service.enhance_photo(image_url, body.level)

    if "image" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return image")

    raw = result["image"]
    file_name = save_generated_file(raw, kind="image")

    return PhotoGenerateResponse(
        image_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# VIDEO
# ----------------------

@router.post("/generate/video", response_model=VideoGenerateResponse)
async def generate_video(
    body: VideoGenerateRequest,
    request: Request,
):
    prompt = body.prompt

    if body.translate_to_en:
        try:
            prompt = await translator_service.translate_ru_to_en(prompt)
        except:
            pass

    image_url = normalize_photo_url(request, body.photo_url)

    result = await kie_service.generate_video(
        image_url=image_url,
        prompt=prompt,
        model=body.model or "grok/minimax-2.5",
        duration=body.duration,
        resolution=body.resolution or "1280x720",
    )

    if "video" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return video")

    raw = result["video"]
    file_name = save_generated_file(raw, kind="video")

    return VideoGenerateResponse(
        video_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# OWN MODEL NORMALIZATION
# ----------------------

@router.post("/generate/normalize/own_model", response_model=PhotoGenerateResponse)
async def normalize_own_model(
    body: NormalizeOwnModelRequest,
    request: Request,
):
    item_url = normalize_photo_url(request, body.item_photo_url)
    model_url = normalize_photo_url(request, body.model_photo_url)

    result = await kie_service.normalize_own_model(
        item_image_url=item_url,
        model_image_url=model_url,
    )

    if "image" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return image")

    raw = result["image"]
    file_name = save_generated_file(raw, kind="image")

    return PhotoGenerateResponse(
        image_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# NEW MODEL NORMALIZATION
# ----------------------

@router.post("/generate/normalize/new_model", response_model=PhotoGenerateResponse)
async def normalize_new_model(
    body: NormalizeNewModelRequest,
    request: Request,
    db: Session = Depends(get_db_dependency),
):
    model_prompt = body.model_prompt

    if body.model_item_id:
        item = db.get(ModelItem, body.model_item_id)
        if not item or not item.is_active:
            raise HTTPException(status_code=404, detail="Model item not found")
        model_prompt = item.prompt

    if body.translate_to_en:
        try:
            model_prompt = await translator_service.translate_ru_to_en(model_prompt)
        except:
            pass

    item_url = normalize_photo_url(request, body.item_photo_url)

    result = await kie_service.normalize_new_model(
        item_image_url=item_url,
        model_prompt=model_prompt,
    )

    if "image" not in result:
        raise HTTPException(status_code=500, detail="KIE did not return image")

    raw = result["image"]
    file_name = save_generated_file(raw, kind="image")

    return PhotoGenerateResponse(
        image_base64=_to_base64(raw),
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# UPLOAD
# ----------------------

@router.post("/upload", response_model=UploadPhotoResponse)
async def upload_photo(file: UploadFile = File(...)):
    raw = await file.read()

    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    file_name = save_generated_file(raw, kind="image")

    return UploadPhotoResponse(
        file_name=file_name,
        file_url=get_file_url(file_name)
    )


# ----------------------
# DELETE
# ----------------------

@router.delete("/files/{file_name}", status_code=204)
async def delete_generated_file_endpoint(file_name: str):
    if not delete_generated_file(file_name):
        raise HTTPException(status_code=404, detail="File not found")
    return Response(status_code=204)
