# backend/utils/media_store.py
import uuid
from pathlib import Path
from typing import Tuple

def save_bytes_to_media(bytes_data: bytes, subdir: str, ext: str) -> Tuple[str, Path]:
    """
    Returns: (file_name, absolute_path)
    """
    subdir_path = Path("media") / subdir
    subdir_path.mkdir(parents=True, exist_ok=True)

    file_name = f"{uuid.uuid4().hex}{ext}"
    abs_path = subdir_path / file_name
    abs_path.write_bytes(bytes_data)
    return file_name, abs_path
