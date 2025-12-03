# services/description_service.py

import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
import httpx

from core.config import settings
from core.database import get_db
from services.promnt_loader import PromptLoaderService
from services.strict_validator import StrictValidatorService


class DescriptionService:
    def __init__(self):
        self.validator = StrictValidatorService()

        # OpenAI rasmiy klienti
        if settings.USE_PROXY and settings.PROXY_URL:
            http_client = httpx.Client(
                proxies={
                    "http://": settings.PROXY_URL,
                    "https://": settings.PROXY_URL,
                },
                timeout=180.0,
            )
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)
        else:
            http_client = httpx.Client(timeout=180.0)
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)

    # ===================== DESCRIPTION ===================== #

    def generate_description(
        self,
        characteristics: List[Dict[str, Any]],
        title: Optional[str] = None,
        old_description: Optional[str] = None,
        max_iterations: int = 3,
    ) -> Dict[str, Any]:
        """
        1) OpenAI’dan description generatsiya qiladi (JSON majburiy)
        2) StrictValidatorService bilan validate + fix loop
        3) Har qanday API xatoda – fallback va pipeline yiqilmasligi
        """
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                system_prompt = prompt_loader.get_full_prompt("description_generator")
        except Exception as e:
            print(f"⚠️ Ошибка загрузки промпта description_generator: {e}")
            system_prompt = self._get_fallback_description_prompt()

        base_payload = {
            "characteristics": characteristics,
            "title": title or "",
        }

        print("\n📝 ГЕНЕРАЦИЯ ОПИСАНИЯ")

        try:
            result = self._call_openai_json(
                system_prompt=system_prompt,
                payload=base_payload,
                key="description",
            )
            description = (result.get("description") or "").strip()
            print(f"✅ Сгенерировано: {len(description)} символов")
        except Exception as e:
            # MUHIM: bu yerda yiqilmaymiz, fallback qaytaramiz
            print(f"❌ Ошибка генерации описания через OpenAI: {e}")
            fallback_desc = old_description or ""
            return {
                "old_description": old_description,
                "new_description": fallback_desc,
                "success": False,
                "warnings": [f"Ошибка генерации описания: {str(e)}"],
                "score": 0,
                "attempts": 0,
                "history": [],
            }

        # Validatsiya + fix loop
        validation_result = self.validator.validate_and_fix_loop(
            content=description,
            content_type="description",
            characteristics=characteristics,
            system_prompt=system_prompt,
            max_attempts=max_iterations,
        )

        return {
            "old_description": old_description,
            "new_description": validation_result["content"],
            "success": validation_result["success"],
            "warnings": (
                validation_result["errors"]
                if not validation_result["success"]
                else []
            ),
            "score": validation_result.get("score", 0),
            "attempts": validation_result["attempts"],
            "history": validation_result.get("history", []),
        }

    # ===================== TITLE ===================== #

    def generate_title(
        self,
        subject_name: Optional[str],
        characteristics: List[Dict[str, Any]],
        description: str,
        tech_description: Optional[str] = None,
        old_title: Optional[str] = None,
        max_iterations: int = 3,
    ) -> Dict[str, Any]:
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                system_prompt = prompt_loader.get_full_prompt("title_generator")
        except Exception as e:
            print(f"⚠️ Ошибка загрузки промпта title_generator: {e}")
            system_prompt = self._get_fallback_title_prompt()

        base_payload = {
            "subject_name": subject_name or "",
            "tech_description": tech_description or "",
            "characteristics": characteristics,
            "description": description,
        }

        print("\n🏷️ ГЕНЕРАЦИЯ TITLE")

        try:
            result = self._call_openai_json(
                system_prompt=system_prompt,
                payload=base_payload,
                key="title",
            )
            title = (result.get("title") or "").strip()
            print(f"✅ Сгенерировано: {title}")
        except Exception as e:
            print(f"❌ Ошибка генерации title через OpenAI: {e}")
            fallback_title = old_title or (subject_name or "")
            return {
                "old_title": old_title,
                "new_title": fallback_title,
                "success": False,
                "warnings": [f"Ошибка генерации title: {str(e)}"],
                "score": 0,
                "attempts": 0,
                "history": [],
            }

        validation_result = self.validator.validate_and_fix_loop(
            content=title,
            content_type="title",
            characteristics=characteristics,
            system_prompt=system_prompt,
            max_attempts=max_iterations,
        )

        return {
            "old_title": old_title,
            "new_title": validation_result["content"],
            "success": validation_result["success"],
            "warnings": (
                validation_result["errors"]
                if not validation_result["success"]
                else []
            ),
            "score": validation_result.get("score", 0),
            "attempts": validation_result["attempts"],
            "history": validation_result.get("history", []),
        }

    # ===================== OPENAI LOW-LEVEL ===================== #

    def _call_openai_json(
        self,
        system_prompt: str,
        payload: Dict[str, Any],
        key: str,
    ) -> Dict[str, Any]:
        """
        Chat Completions orqali **JSON majburiy** javob olish.
        - response_format={"type": "json_object"}
        - ```json ... ``` ni tozalash
        - json.loads() ni try/except bilan
        """
        # 2-3 marta retry qilish mumkin bo'lsa yaxshi, hozir 1 marta
        response = self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False),
                },
            ],
            max_completion_tokens=2048,
            response_format={"type": "json_object"},
        )

        raw = (response.choices[0].message.content or "").strip()

        # ```json ... ``` bo'lsa – tozalaymiz
        if raw.startswith("```"):
            # uchta ``` blok orasidagi kontentni olamiz
            parts = raw.split("```")
            if len(parts) >= 3:
                raw = parts[1].strip() if parts[1].strip() else parts[2].strip()

        raw = raw.strip()
        if not raw:
            raise ValueError("Пустой ответ от OpenAI (пустой content)")

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print("❌ JSON decode error в DescriptionService._call_openai_json")
            print("RAW RESPONSE:", raw[:1000])  # debug uchun bir qismini chiqarish
            raise ValueError(f"Failed to parse JSON from OpenAI: {e}")

        if key and key not in data:
            # Agar model key bermasa, hamon ishlatish mumkin bo'lsin
            print(
                f"⚠️ Ключ '{key}' не найден в ответе OpenAI. Полный ответ: {data}"
            )
        return data

    # ===================== FALLBACK PROMPTS ===================== #

    def _get_fallback_description_prompt(self) -> str:
        return """
Ты — генератор ОПИСАНИЯ для Wildberries.

ЦЕЛЬ:
1. Точное понимание товара
2. SEO

ИСТОЧНИКИ:
- characteristics
- title

СТРУКТУРА:
1. Вступление (1–2 предложения)
2. Конструкция и посадка
3. Материалы
4. Назначение
5. Особенности

ЗАПРЕЩЕНО:
✗ Маркетинг: лучшее, топ, премиум
✗ Обещания: делает стройнее
✗ Списки, CAPS, эмодзи

ДЛИНА:
- Идеал: 1000–1800
- Макс: 2500

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "description": "Текст описания без переносов строк в JSON"
}
""".strip()

    def _get_fallback_title_prompt(self) -> str:
        return """
Ты — генератор TITLE для Wildberries.

СТРОГАЯ ФОРМУЛА:
Категория + Ключевой признак + (Конструктивный элемент) + (Назначение)

ИСТОЧНИКИ:
- subject_name: категория
- characteristics
- description

ПРАВИЛО ЦВЕТА:
1. Посмотри в characteristics["Цвет"]
2. Если цвет там — НЕ добавляй в title
3. Исключение: цвет — ключевая особенность

ЗАПРЕЩЕНО:
✗ стильный, хит, топ, супер, премиум
✗ красивый, идеальный
✗ женский, мужской
✗ CAPS, эмодзи, повторы

ЛИМИТЫ:
- Идеал: 35–50 символов
- Макс: 60 символов

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "title": "Костюм двубортный приталенный"
}
""".strip()
