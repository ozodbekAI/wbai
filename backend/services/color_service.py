from typing import List, Dict, Any, Optional

from services.base.openai_service import BaseOpenAIService
from core.database import get_db
from services.promnt_loader import PromptLoaderService
from services.data_loader import DataLoader


class ColorService(BaseOpenAIService):

    def detect_colors_from_text(
        self,
        image_description: str,
        log_callback=None,
    ):

        dataloader = DataLoader()

        try:
            max_colors = 5
            system_prompt_parent = self._load_prompt(type="parent")
            system_prompt_names = self._load_prompt(type="names")
            parent_names = dataloader.load_parent_names()
            if isinstance(parent_names, set):
                parent_names = sorted(list(parent_names))

            if log_callback:
                log_callback("🎨 Detecting colors from text...")

            result_parent = self._call_openai(
                system_prompt=system_prompt_parent,
                user_payload={
                    "image_description": image_description,
                    "allowed_colors": parent_names,
                    "max_colors": 3,
                },
                photo_urls=None,
                max_tokens=4096,
            )

            colors_parent = result_parent.get("colors") or []
            if not colors_parent:
                if log_callback:
                    log_callback("⚠️ Parent color not detected")
                return []



            color_items = []
            for i in colors_parent:
                color_items.append(dataloader.load_by_parent(i))
            # print("COLOR ITEMS:", color_items)

            if not color_items:
                return [colors_parent]

            result_names = self._call_openai(
                system_prompt=system_prompt_names,
                user_payload={
                    "image_description": image_description,
                    "allowed_colors": color_items,
                    "max_colors": max_colors,
                },
                photo_urls=None,
                max_tokens=8196,
            )

            # print("RESULT ----------------------- NAMES:", result_names)


            # print("NAMES COLORS:", result_names)

            if log_callback:
                log_callback(f"✅ Colors detected: {', '.join(result_names) or colors_parent}")

            return result_names or [colors_parent], color_items

        except Exception as e:
            if log_callback:
                log_callback(f"❌ Color detection error: {str(e)}")
            return []
    

    def _load_prompt(self, type: str) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt(f"color_detector_{type}")
        except Exception:
            return self.get_fallback_prompt(type=type)
    
    def _extract_colors(
        self,
        result: Dict[str, Any],
        allowed_colors,
        max_colors: int
    ) -> List[str]:

        allowed_list: List[str] = []

        if isinstance(allowed_colors, dict):
            for v in allowed_colors.values():
                if isinstance(v, list):
                    allowed_list.extend(v)
        elif isinstance(allowed_colors, (list, tuple, set)):
            allowed_list = list(allowed_colors)
        else:
            allowed_list = []

        allowed_set = {c.strip().lower() for c in allowed_list if isinstance(c, str)}

        detected: List[str] = []

        for color in result.get("colors", []) or []:
            if not isinstance(color, str):
                continue

            normalized = color.strip().lower()

            if normalized in allowed_set and color not in detected:
                detected.append(color)

                if len(detected) >= min(5, max_colors):
                    break

        return detected

    def get_fallback_prompt(self, type: str) -> str:
        if type == "parent":
            return """
Ты — детектор цветов для Wildberries (работает с ТЕКСТОМ).

ЗАДАЧА: Определить цвета товара из текстового описания.

ВАЖНО: 
- У тебя НЕТ фотографий, только текстовое описание!
- Анализируй ТОЛЬКО упомянутые в тексте цвета
- НЕ придумывай цвета, которых нет в описании

ПРАВИЛА:
1. Выбирай ТОЛЬКО из списка allowed_colors
4. Максимум цветов: 1
5. Порядок важен: от основного к второстепенному

ПРИМЕРЫ:

Описание: "черная куртка с серыми вставками"
→ ["черный", "серый"]

Описание: "синее платье с белыми полосками"
→ ["синий", "белый"]

Описание: "темно-серое пальто"
→ ["серый"]

ФОРМАТ ОТВЕТА (JSON):
{
  "colors": ["черный"],
  "confidence": "high",
  "notes": "Основной черный, дополнительный серый"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""".strip()
    
        elif type == "names":
            return """
Ты — детектор цветов для Wildberries (работает с ТЕКСТОМ).
ЗАДАЧА: Определить цвета товара из текстового описания.
ВАЖНО: 
- У тебя НЕТ фотографий, только текстовое описание!
- Анализируй ТОЛЬКО упомянутые в тексте цвета
- НЕ придумывай цвета, которых нет в описании
ПРАВИЛА:
1. Выбирай ТОЛЬКО из списка allowed_colors
2. Начни с основного/доминирующего цвета
3. Затем добавь дополнительные цвета (если упомянуты)
4. Максимум цветов: 5
5. Порядок важен: от основного к второстепенному



ФОРМАТ ОТВЕТА (JSON):
{
  "colors": ["коричневый", "грильяж", "медно-шоколадный"],
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
        """