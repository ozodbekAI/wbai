# backend/routers/photo_upload.py

import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from core.config import settings

router = APIRouter(
    prefix="/api/photo",
    tags=["Photo - Upload"],
)


@router.post("/upload")
async def upload_photo(request: Request, file: UploadFile = File(...)):
    # Kontent turini tekshiramiz
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Fayl nomi va extension
    _, ext = os.path.splitext(file.filename or "")
    if not ext:
        ext = ".jpg"

    filename = f"{uuid.uuid4().hex}{ext}"

    # Saqlanadigan papka: MEDIA_ROOT/photo_uploads
    upload_dir = os.path.join(settings.MEDIA_ROOT, "photo_uploads")
    os.makedirs(upload_dir, exist_ok=True)

    full_path = os.path.join(upload_dir, filename)

    # Faylni diskka yozish
    content = await file.read()
    with open(full_path, "wb") as f:
        f.write(content)

    # To‘liq URL: http://host:port/media/photo_uploads/<filename>
    base_url = str(request.base_url).rstrip("/")
    file_url = f"{base_url}/media/photo_uploads/{filename}"

    return {
        "file_name": filename,
        "file_url": file_url,
    }
