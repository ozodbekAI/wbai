# backend/api/photo.py (yoki sizdagi router fayl nomi)

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from pydantic import BaseModel
from typing import Optional, List, Literal
import base64
import logging
import os
from pathlib import Path

from core.database import get_db_dependency
from core.dependencies import get_current_user
from repositories.scence_repositories import SceneCategoryRepository, PoseRepository
from repositories.model_repository import ModelRepository 
from services.kie_service.kie_services import kie_service
from sqlalchemy.orm import Session

from core.config import settings
from services.media_storage import save_generated_file, get_file_url, delete_generated_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/photo", tags=["Photo Generation"])



class SceneGenerateRequest(BaseModel):
    photo_url: str
    item_id: int


class PoseGenerateRequest(BaseModel):
    photo_url: str
    prompt_id: int


class CustomGenerateRequest(BaseModel):
    photo_url: str
    prompt: str
    translate_to_en: bool = True


class EnhancePhotoRequest(BaseModel):
    photo_url: str
    level: str = "medium" 


class VideoGenerateRequest(BaseModel):
    photo_url: str
    prompt: str
    plan_key: Optional[str] = None
    duration: int = 5
    resolution: str = "1280x720"
    model: str = "grok-imagine/image-to-video"
    translate_to_en: bool = True

class NormalizeGenerateRequest(BaseModel):
    mode: Literal["own_model", "new_model"]  

    # own_model
    photo_url_1: Optional[str] = None
    photo_url_2: Optional[str] = None

    # new_model
    photo_url: Optional[str] = None
    model_item_id: Optional[int] = None


class PhotoGenerationResponse(BaseModel):
    image_base64: str
    file_name: Optional[str] = None   
    file_url: Optional[str] = None    


class VideoGenerationResponse(BaseModel):
    video_base64: str
    file_name: Optional[str] = None   # relative path: videos/xxx.mp4
    file_url: Optional[str] = None    # full URL: https://.../media/videos/xxx.mp4


class GeneratedItem(BaseModel):
    file_name: str                    # relative path
    file_url: str                     # full url
    kind: Literal["image", "video"]
    created_at: str                   # ISO string


class GeneratedListResponse(BaseModel):
    items: List[GeneratedItem]
    limit: int
    offset: int
    total: int
    has_more: bool


# 🔹 MODEL DICTIONARY SCHEMAS (NORMALIZE uchun)
class ModelCategoryOut(BaseModel):
    id: int
    name: str


class ModelSubcategoryOut(BaseModel):
    id: int
    name: str


class ModelItemOut(BaseModel):
    id: int
    name: str
    prompt: Optional[str] = None


# ===== HELPERS =====

def _kind_from_rel_path(rel_path: str) -> str:
    rel_path = (rel_path or "").lower()
    if rel_path.startswith("videos/") or rel_path.endswith(".mp4"):
        return "video"
    return "image"


def _scan_generated_files() -> List[dict]:
    """
    Scans:
      <MEDIA_ROOT>/photos/*
      <MEDIA_ROOT>/videos/*
    Sorts by mtime DESC.
    """
    media_root = Path(settings.MEDIA_ROOT)
    photos_dir = media_root / "photos"
    videos_dir = media_root / "videos"

    out = []

    for base_dir, kind in [(photos_dir, "image"), (videos_dir, "video")]:
        if not base_dir.exists():
            continue
        for p in base_dir.glob("*"):
            if not p.is_file():
                continue
            # minimal filter
            if kind == "image" and p.suffix.lower() not in [".png", ".jpg", ".jpeg", ".webp"]:
                continue
            if kind == "video" and p.suffix.lower() not in [".mp4", ".mov", ".webm"]:
                continue

            rel = p.relative_to(media_root).as_posix()  # "photos/xxx.png"
            try:
                mtime = p.stat().st_mtime
            except Exception:
                mtime = 0

            out.append({"rel": rel, "kind": kind, "mtime": mtime})

    out.sort(key=lambda x: x["mtime"], reverse=True)
    return out


# ===== GENERATED LIST (PAGINATION) =====
@router.get("/generated", response_model=GeneratedListResponse)
async def list_generated(
    limit: int = Query(24, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    """
    Pagination for generated media.
    Newest first.
    """
    items = _scan_generated_files()
    total = len(items)
    page = items[offset: offset + limit]

    resp_items = []
    for it in page:
        rel = it["rel"]
        resp_items.append(
            GeneratedItem(
                file_name=rel,
                file_url=get_file_url(rel),
                kind=it["kind"],
                created_at="",  # optional; can be derived if you keep metadata in DB later
            )
        )

    return GeneratedListResponse(
        items=resp_items,
        limit=limit,
        offset=offset,
        total=total,
        has_more=(offset + limit) < total,
    )


@router.delete("/generated")
async def delete_generated(
    file_name: str = Query(..., description="relative path: photos/xxx.png or videos/xxx.mp4"),
    user: dict = Depends(get_current_user),
):
    ok = delete_generated_file(file_name)
    return {"status": "deleted" if ok else "not_found", "file_name": file_name}


# ===== SCENE GENERATION =====

@router.post("/generate/scene", response_model=PhotoGenerationResponse)
async def generate_scene(
    request: SceneGenerateRequest,
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    try:
        scene_repo = SceneCategoryRepository(db)

        item = scene_repo.get_item(request.item_id)
        if not item:
            raise HTTPException(404, "Scene item not found")

        sub = scene_repo.get_subcategory(item.subcategory_id)
        cat = scene_repo.get_category(sub.category_id)

        full_prompt = (
            "Create a professional product card: Place the product from the "
            f"reference image into the scene: {cat.name} → {sub.name} → {item.name}. "
            f"Details: {item.prompt}. High quality, photorealistic, studio lighting, clean background."
        )

        result = await kie_service.change_scene(request.photo_url, full_prompt)

        image_bytes = result["image"]
        rel_path = save_generated_file(image_bytes, kind="image")
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        return PhotoGenerationResponse(
            image_base64=image_base64,
            file_name=rel_path,
            file_url=get_file_url(rel_path),
        )

    except Exception as e:
        logger.error(f"Scene generation error: {e}")
        raise HTTPException(500, str(e))


# ===== POSE GENERATION =====

@router.post("/generate/pose", response_model=PhotoGenerationResponse)
async def generate_pose(
    request: PoseGenerateRequest,
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    try:
        pose_repo = PoseRepository(db)

        pose_prompt = pose_repo.get_prompt(request.prompt_id)
        if not pose_prompt:
            raise HTTPException(404, "Pose prompt not found")

        result = await kie_service.change_pose(request.photo_url, pose_prompt.prompt)

        image_bytes = result["image"]
        rel_path = save_generated_file(image_bytes, kind="image")
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        return PhotoGenerationResponse(
            image_base64=image_base64,
            file_name=rel_path,
            file_url=get_file_url(rel_path),
        )

    except Exception as e:
        logger.error(f"Pose generation error: {e}")
        raise HTTPException(500, str(e))


# ===== CUSTOM PROMPT =====

@router.post("/generate/custom", response_model=PhotoGenerationResponse)
async def generate_custom(
    request: CustomGenerateRequest,
    user: dict = Depends(get_current_user),
):
    try:
        prompt = request.prompt
        result = await kie_service.custom_generation(request.photo_url, prompt)

        image_bytes = result["image"]
        rel_path = save_generated_file(image_bytes, kind="image")
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        return PhotoGenerationResponse(
            image_base64=image_base64,
            file_name=rel_path,
            file_url=get_file_url(rel_path),
        )

    except Exception as e:
        logger.error(f"Custom generation error: {e}")
        raise HTTPException(500, str(e))


# ===== ENHANCE PHOTO =====

@router.post("/generate/enhance", response_model=PhotoGenerationResponse)
async def enhance_photo(
    request: EnhancePhotoRequest,
    user: dict = Depends(get_current_user),
):
    try:
        result = await kie_service.enhance_photo(request.photo_url, request.level)

        image_bytes = result["image"]
        rel_path = save_generated_file(image_bytes, kind="image")
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        return PhotoGenerationResponse(
            image_base64=image_base64,
            file_name=rel_path,
            file_url=get_file_url(rel_path),
        )

    except Exception as e:
        logger.error(f"Enhance photo error: {e}")
        raise HTTPException(500, str(e))


# ===== VIDEO GENERATION =====

@router.post("/generate/video", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerateRequest,
    user: dict = Depends(get_current_user),
):
    try:
        prompt = request.prompt

        result = await kie_service.generate_video(
            image_url=request.photo_url,
            prompt=prompt,
            model=request.model,
            duration=request.duration,
            resolution=request.resolution,
        )

        video_bytes = result["video"]
        rel_path = save_generated_file(video_bytes, kind="video")
        video_base64 = base64.b64encode(video_bytes).decode("utf-8")

        return VideoGenerationResponse(
            video_base64=video_base64,
            file_name=rel_path,
            file_url=get_file_url(rel_path),
        )

    except Exception as e:
        logger.error(f"Video generation error: {e}")
        raise HTTPException(500, str(e))


# ===== NORMALIZE MODELS DICTIONARY (categories / subcategories / items) =====

@router.get("/models/categories", response_model=List[ModelCategoryOut])
async def list_model_categories(
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    repo = ModelRepository(db)
    cats = repo.list_categories()
    return [ModelCategoryOut(id=c.id, name=c.name) for c in cats]


@router.get("/models/subcategories", response_model=List[ModelSubcategoryOut])
async def list_model_subcategories(
    category_id: int = Query(..., ge=1),
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    repo = ModelRepository(db)
    subs = repo.list_subcategories_by_category(category_id)
    return [ModelSubcategoryOut(id=s.id, name=s.name) for s in subs]


@router.get("/models/items", response_model=List[ModelItemOut])
async def list_model_items(
    subcategory_id: int = Query(..., ge=1),
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    repo = ModelRepository(db)
    items = repo.list_items_by_subcategory(subcategory_id)
    return [
        ModelItemOut(
            id=i.id,
            name=getattr(i, "name", ""),
            prompt=getattr(i, "prompt", None),
        )
        for i in items
    ]


# ===== NORMALIZE GENERATION (OWN / NEW MODEL) =====

@router.post("/generate/normalize", response_model=PhotoGenerationResponse)
async def generate_normalize(
    request: NormalizeGenerateRequest,
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    """
    mode = "own_model":
        - photo_url_1: item
        - photo_url_2: model

    mode = "new_model":
        - photo_url: item
        - model_item_id: tipaj ID (DB dan prompt olib ishlatiladi)
    """
    try:
        if request.mode == "own_model":
            if not request.photo_url_1 or not request.photo_url_2:
                raise HTTPException(
                    400,
                    "photo_url_1 and photo_url_2 are required for mode=own_model",
                )

            result = await kie_service.normalize_own_model(
                item_image_url=request.photo_url_1,
                model_image_url=request.photo_url_2,
            )

        elif request.mode == "new_model":
            if not request.photo_url or not request.model_item_id:
                raise HTTPException(
                    400,
                    "photo_url and model_item_id are required for mode=new_model",
                )

            repo = ModelRepository(db)
            item = repo.get_item(request.model_item_id)
            if not item:
                raise HTTPException(404, "Model item (tipaj) not found")

            model_prompt = getattr(item, "prompt", None)
            if not model_prompt:
                raise HTTPException(
                    400,
                    "Selected model item does not have prompt description",
                )

            result = await kie_service.normalize_new_model(
                item_image_url=request.photo_url,
                model_prompt=model_prompt,
            )

        else:
            raise HTTPException(400, "Unknown mode, must be 'own_model' or 'new_model'")

        image_bytes = result["image"]
        rel_path = save_generated_file(image_bytes, kind="image")
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        return PhotoGenerationResponse(
            image_base64=image_base64,
            file_name=rel_path,
            file_url=get_file_url(rel_path),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Normalize generation error: {e}")
        raise HTTPException(500, str(e))
