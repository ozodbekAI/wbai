from typing import List, Optional
import json

from services.base.openai_service import BaseOpenAIService
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class ImageAnalyzerService(BaseOpenAIService):
    def analyze_images(
        self,
        photo_urls: List[str],
        subject_name: Optional[str] = None,
        log_callback=None,
        target_char_names: Optional[List[str]] = None,  # 👈 YANGI
    ) -> str:

        if not photo_urls:
            return "Rasm mavjud emas"
        
        try:
            system_prompt = self._load_prompt()
            
            if log_callback:
                log_callback(f"🔍 Analyzing {len(photo_urls)} images...")

            # Target namesni 50 taga cheklab yuborsak ham bo‘ladi
            focus_fields = (target_char_names or [])[:50]

            result = self._call_openai(
                system_prompt=system_prompt,
                user_payload={
                    "subject_name": subject_name or "Unknown product",
                    "task": (
                        "Describe ALL visual details for characteristics. "
                        "Pay special attention to the following characteristics "
                        "and provide as much visual information as possible for each of them."
                    ),
                    "target_characteristics": focus_fields,  # 👈 LLM ga beramiz
                },
                photo_urls=photo_urls,
                max_tokens=16000,
            )
            
            description = result.get("description", "").strip()
            
            if not description:
                raise ValueError("Empty description from image analysis")
            
            if log_callback:
                log_callback(f"✅ Image analysis: {len(description)} characters")
            
            return description
            
        except Exception as e:
            if log_callback:
                log_callback(f"❌ Image analysis error: {str(e)}")
            return f"Image analysis failed: {str(e)}"
    

    def _load_prompt(self) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("image_analyzer")
        except Exception:
            return self.get_fallback_prompt()
    
    def get_fallback_prompt(self) -> str:
        return """
Ты — визуальный аналитик для товаров Wildberries.

ЦЕЛЬ: Создать ДЕТАЛЬНОЕ текстовое описание товара на основе фотографий.
Это описание будет использоваться для определения характеристик.

ТЕБЕ ПЕРЕДАЮТ СПИСОК target_characteristics — ЭТО НАЗВАНИЯ ХАРАКТЕРИСТИК,
КОТОРЫЕ НУЖНО ОСОБО ТЩАТЕЛЬНО ОПИСАТЬ ПО ВИЗУАЛЬНЫМ ПРИЗНАКАМ.
ДЛЯ КАЖДОЙ ХАРАКТЕРИСТИКИ ИЗ target_characteristics НУЖНО ЯВНО УКАЗАТЬ,
ЧТО ВИДНО НА ФОТО (ЕСЛИ ЭТО ВООБЩЕ ВИДНО).

ЧТО ОПИСАТЬ:

1. ЦВЕТА (КРИТИЧНО):
   ...

(остальной текст тот же, как у тебя был, можно оставить без изменений)

ФОРМАТ ОТВЕТА (JSON):
{
  "description": "Подробное текстовое описание всех визуальных характеристик товара..."
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""".strip()
