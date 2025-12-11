from core.config import settings
import os


def save_generated_file(raw: bytes, kind: str) -> str:
    folder = "photos" if kind == "image" else "videos"
    os.makedirs(os.path.join(settings.MEDIA_ROOT, folder), exist_ok=True)

    import uuid
    name = f"{uuid.uuid4().hex}.{'png' if kind == 'image' else 'mp4'}"
    path = os.path.join(settings.MEDIA_ROOT, folder, name)

    with open(path, "wb") as f:
        f.write(raw)

    return f"{folder}/{name}"


def get_file_url(file_name: str) -> str:
    # Frontend uchun
    return f"/media/{file_name}"


def get_public_file_url(file_name: str) -> str:
    # KIE uchun tashqi to‘liq URL
    return f"{settings.PUBLIC_BASE_URL}/media/{file_name}"


def delete_generated_file(file_name: str) -> bool:
    path = os.path.join(settings.MEDIA_ROOT, file_name)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False
