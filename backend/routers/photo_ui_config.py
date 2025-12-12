# backend/routers/photo_ui_config.py

from fastapi import APIRouter
from services.kie_service.ui_config import KIE_UI_CONFIG

router = APIRouter(prefix="/api/photo", tags=["photo-ui-config"])


@router.get("/ui-config")
async def get_photo_ui_config():
    """
    Front uchun AI Foto Studiya konfiguratsiyasi:
    - buttons: product_card / normalize / video / photo tariflari
    - video_scenarios: hozircha statik bo'sh (xohlasang keyin DB dan to'ldirasan)
    """
    return KIE_UI_CONFIG
