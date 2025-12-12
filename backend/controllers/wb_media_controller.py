# controllers/wb_media_controller.py

from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
from repositories.wb_repository import WBRepository


class WBMediaController:
    def __init__(self):
        self.repo = WBRepository()

    async def sync_media(
        self,
        nm_id: int,
        final_photos: List[Dict[str, Any]],
        new_files: List[UploadFile],
    ):
        uploaded_urls: List[str] = []

        # 1) yangi fayllarni yuklash
        for index, file in enumerate(new_files, start=1):
            data = await file.read()
            if not data:
                continue

            try:
                resp = self.repo.upload_media_file(
                    nm_id=nm_id,
                    photo_number=index,
                    file_bytes=data,
                    filename=file.filename or f"image_{index}.jpg",
                    content_type=file.content_type or "image/jpeg",
                )
                url = resp.get("data", {}).get("file")
                if url:
                    uploaded_urls.append(url)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Upload failed: {e}")

        # 2) frontenddan kelgan final_photos ichidan URL larni olish
        final_urls: List[str] = []
        for p in final_photos:
            # { "url": "...", "order": 1 }
            if isinstance(p, dict) and "url" in p and p["url"]:
                final_urls.append(p["url"])

        # 3) yangi yuklangan rasmlar URLlarini oxiriga qo‘shamiz
        final_urls.extend(uploaded_urls)

        # 4) /content/v3/media/save
        try:
            save_resp = self.repo.save_media_state(nm_id, final_urls)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Save order failed: {e}")

        return {
            "uploaded": uploaded_urls,
            "final_data_sent": final_urls,
            "saved": save_resp,
        }
