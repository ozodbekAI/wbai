import os
import uuid
from core.config import settings


def save_generated_file(content: bytes, kind: str = "image") -> str:
    """
    Returns relative path (e.g. "photos/<uuid>.png" or "videos/<uuid>.mp4")
    """
    kind = (kind or "image").lower()
    if kind not in ("image", "video"):
        kind = "image"

    ext = ".png" if kind == "image" else ".mp4"
    folder = "photos" if kind == "image" else "videos"

    file_name = f"{uuid.uuid4().hex}{ext}"
    rel_path = os.path.join(folder, file_name).replace("\\", "/")

    abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    with open(abs_path, "wb") as f:
        f.write(content)

    return rel_path


def get_file_url(rel_path: str) -> str:
    """
    Always returns public URL to backend media:
      <PUBLIC_BASE_URL>/media/<rel_path>
    """
    rel_path = (rel_path or "").lstrip("/").replace("\\", "/")
    return f"{settings.PUBLIC_BASE_URL}/media/{rel_path}"


def delete_generated_file(rel_path: str) -> bool:
    rel_path = (rel_path or "").lstrip("/").replace("\\", "/")
    abs_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    if os.path.exists(abs_path) and os.path.isfile(abs_path):
        os.remove(abs_path)
        return True
    return False
