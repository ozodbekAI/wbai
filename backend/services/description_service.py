# services/description_service.py

import json
import time
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
        http_client = httpx.Client(timeout=180.0)
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)

    # ===================== DESCRIPTION ===================== #

    def generate_description(
        self,
        image_description: str,
        max_iterations: int = 3,
        old_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        DESCRIPTION faqat image_description asosida yaratiladi.
        """
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                system_prompt = prompt_loader.get_full_prompt("description_generator")
        except Exception as e:
            print(f"⚠️ Ошибка загрузки промпта description_generator: {e}")
            system_prompt = self._get_fallback_description_prompt()

        base_payload = {
            "image_description": image_description or "",
        }

        print("\n📝 ГЕНЕРАЦИЯ ОПИСАНИЯ (ONLY IMAGE DESCRIPTION)")
        print(f"🔍 Image description length: {len(image_description or '')}")

        try:
            result = self._call_openai_description(
                system_prompt=system_prompt,
                payload=base_payload,
            )
            description = (result.get("description") or "").strip()
            
            if not description:
                print("⚠️ OpenAI вернул пустое описание")
                description = old_description or ""
            else:
                print(f"✅ Сгенерировано: {len(description)} символов")
                
        except Exception as e:
            print(f"❌ Ошибка генерации описания: {e}")
            return {
                "old_description": old_description,
                "new_description": old_description or "",
                "success": False,
                "warnings": [str(e)],
                "score": 0,
                "attempts": 0,
            }

        # VALIDATOR
        validation_result = self.validator.validate_and_fix_loop(
            content=description,
            content_type="description",
            characteristics=[],
            system_prompt=system_prompt,
            max_attempts=max_iterations,
        )

        return {
            "old_description": old_description,
            "new_description": validation_result["content"],
            "success": validation_result["success"],
            "warnings": validation_result["errors"] if not validation_result["success"] else [],
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
        print(f"🔍 Subject: {subject_name}, Description length: {len(description)}")

        try:
            result = self._call_openai_json(
                system_prompt=system_prompt,
                payload=base_payload,
                key="title",
            )
            title = (result.get("title") or "").strip()
            
            if not title:
                print("⚠️ OpenAI вернул пустой title")
                title = old_title or (subject_name or "")
            else:
                print(f"✅ Сгенерировано: {title}")
                
        except Exception as e:
            print(f"❌ Ошибка генерации title: {e}")
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

    def _call_openai_description(
        self,
        system_prompt: str,
        payload: Dict[str, Any],
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        FIXED: Full debug logging + bo'sh javob retry
        """
        user_prompt = (
            "Сгенерируй строго JSON.\n"
            "Формат:\n"
            '{ "description": "..." }\n\n'
            f"ДАННЫЕ:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        print("\n" + "="*60)
        print("📤 SENDING TO OPENAI (DESCRIPTION)")
        print("="*60)
        print(f"Model: {settings.OPENAI_MODEL}")
        print(f"System prompt length: {len(system_prompt)}")
        print(f"\n--- SYSTEM PROMPT ---")
        print(system_prompt[:500] + "..." if len(system_prompt) > 500 else system_prompt)
        print(f"\n--- USER PROMPT ---")
        print(user_prompt[:800] + "..." if len(user_prompt) > 800 else user_prompt)
        print("="*60 + "\n")

        for attempt in range(1, max_retries + 1):
            try:
                print(f"⏳ Попытка {attempt}/{max_retries}...")
                
                response = self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    max_completion_tokens=2048,
                    response_format={"type": "json_object"},
                )

                raw = response.choices[0].message.content
                
                print("\n" + "="*60)
                print("📥 OPENAI RESPONSE (DESCRIPTION)")
                print("="*60)
                print(f"Finish reason: {response.choices[0].finish_reason}")
                print(f"Raw content length: {len(raw) if raw else 0}")
                print(f"\n--- RAW CONTENT ---")
                print(raw if raw else "[EMPTY]")
                print("="*60 + "\n")
                
                if not raw or not raw.strip():
                    print(f"⚠️ Попытка {attempt}: пустой ответ от OpenAI")
                    if attempt < max_retries:
                        time.sleep(2)
                        continue
                    print("❌ Все попытки исчерпаны - возвращаю пустой результат")
                    return {"description": ""}

                raw = raw.strip()

                # Markdown блоков tozalash
                if raw.startswith("```json"):
                    raw = raw[7:]
                elif raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                
                raw = raw.strip()
                
                if not raw:
                    print(f"⚠️ Попытка {attempt}: пусто после очистки markdown")
                    if attempt < max_retries:
                        time.sleep(2)
                        continue
                    return {"description": ""}

                # JSON parse
                try:
                    data = json.loads(raw)
                    print(f"✅ JSON parsed successfully")
                    print(f"Keys in response: {list(data.keys())}")
                    
                    if "description" not in data:
                        print("⚠️ Key 'description' missing, adding empty")
                        data["description"] = ""
                    else:
                        print(f"✅ Description length: {len(data['description'])}")
                    
                    return data
                    
                except json.JSONDecodeError as e:
                    print(f"⚠️ Попытка {attempt}: JSON decode error - {e}")
                    print(f"Raw content preview: {raw[:300]}...")
                    if attempt < max_retries:
                        time.sleep(2)
                        continue
                    return {"description": ""}

            except Exception as e:
                print(f"❌ Попытка {attempt} - OpenAI API error: {type(e).__name__}: {e}")
                if attempt < max_retries:
                    time.sleep(2)
                    continue
                raise

        print("⚠️ Все попытки исчерпаны, возвращаю пустое описание")
        return {"description": ""}


    def _call_openai_json(
        self,
        system_prompt: str,
        payload: Dict[str, Any],
        key: str,
        retries: int = 3,
    ) -> Dict[str, Any]:
        """
        FIXED: Full debug logging + bo'sh javob retry
        """
        fallback = {key: ""}

        print("\n" + "="*60)
        print(f"📤 SENDING TO OPENAI ({key.upper()})")
        print("="*60)
        print(f"Model: {settings.OPENAI_MODEL}")
        print(f"Expected key: {key}")
        print(f"System prompt length: {len(system_prompt)}")
        print(f"\n--- SYSTEM PROMPT ---")
        print(system_prompt[:500] + "..." if len(system_prompt) > 500 else system_prompt)
        print(f"\n--- PAYLOAD ---")
        payload_str = json.dumps(payload, ensure_ascii=False, indent=2)
        print(payload_str[:800] + "..." if len(payload_str) > 800 else payload_str)
        print("="*60 + "\n")

        for attempt in range(1, retries + 1):
            try:
                print(f"⏳ Попытка {attempt}/{retries}...")
                
                response = self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                    ],
                    response_format={"type": "json_object"},
                    max_completion_tokens=2048,
                )

                msg = response.choices[0].message
                raw = (msg.content or "").strip()

                print("\n" + "="*60)
                print(f"📥 OPENAI RESPONSE ({key.upper()})")
                print("="*60)
                print(f"Finish reason: {response.choices[0].finish_reason}")
                print(f"Raw content length: {len(raw)}")
                print(f"\n--- RAW CONTENT ---")
                print(raw if raw else "[EMPTY]")
                print("="*60 + "\n")

                if not raw:
                    print(f"⚠️ Попытка {attempt}: пустой raw content")
                    if attempt < retries:
                        time.sleep(2)
                        continue
                    print(f"❌ Возвращаю fallback: {fallback}")
                    return fallback

                # Markdown tozalash
                if raw.startswith("```json"):
                    raw = raw[7:]
                elif raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]

                raw = raw.strip()
                
                if not raw:
                    print(f"⚠️ Попытка {attempt}: пусто после markdown cleanup")
                    if attempt < retries:
                        time.sleep(2)
                        continue
                    return fallback

                # JSON decode
                try:
                    data = json.loads(raw)
                    print(f"✅ JSON parsed successfully")
                    print(f"Keys in response: {list(data.keys())}")
                    
                    if key not in data:
                        print(f"⚠️ Key '{key}' missing, adding empty")
                        data[key] = ""
                    else:
                        print(f"✅ {key} value: {data[key][:100] if len(str(data[key])) > 100 else data[key]}")
                    
                    return data
                    
                except json.JSONDecodeError as e:
                    print(f"⚠️ Попытка {attempt}: JSON decode error - {e}")
                    print(f"Raw preview: {raw[:300]}...")
                    if attempt < retries:
                        time.sleep(2)
                        continue
                    return fallback

            except Exception as e:
                print(f"❌ Попытка {attempt}: {type(e).__name__}: {e}")
                if attempt < retries:
                    time.sleep(2)
                else:
                    return fallback

        print(f"⚠️ Возвращаю fallback - все попытки провалены: {fallback}")
        return fallback


    # ===================== FALLBACK PROMPTS ===================== #

    def _get_fallback_description_prompt(self) -> str:
        return """
Ты — генератор ОПИСАНИЯ для Wildberries.

ЦЕЛЬ:
1. Точное понимание товара
2. SEO

ИСТОЧНИКИ:
- image_description

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

ОБЯЗАТЕЛЬНО верни JSON:
{
  "description": "Текст описания..."
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

ОБЯЗАТЕЛЬНО верни JSON:
{
  "title": "Костюм двубортный приталенный"
}
""".strip()