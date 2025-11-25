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
        
        # Proxy bilan yoki proxy'siz client yaratish
        if settings.USE_PROXY and settings.PROXY_URL:
            http_client = httpx.Client(
                proxies={
                    "http://": settings.PROXY_URL,
                    "https://": settings.PROXY_URL,
                },
                timeout=180.0
            )
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def generate_description(
        self,
        tech_description: Optional[str],
        characteristics: List[Dict[str, Any]],
        title: Optional[str] = None,
        old_description: Optional[str] = None,
        max_iterations: int = 3,
    ) -> Dict[str, Any]:
        """Генерация описания с СТРОГОЙ валидацией"""
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                system_prompt = prompt_loader.get_full_prompt("description_generator")
        except Exception as e:
            print(f"⚠️ Ошибка загрузки промпта description_generator: {e}")
            # Fallback to default prompt if DB fails
            system_prompt = self._get_fallback_description_prompt()
        
        base_payload = {
            "tech_description": tech_description or "",
            "characteristics": characteristics,
            "title": title or "",
        }
        
        print(f"\n📝 ГЕНЕРАЦИЯ ОПИСАНИЯ")
        result = self._call_openai(system_prompt, base_payload)
        description = result.get("description", "").strip()
        print(f"✅ Сгенерировано: {len(description)} символов")
        
        validation_result = self.validator.validate_and_fix_loop(
            content=description,
            content_type="description",
            characteristics=characteristics,
            system_prompt=system_prompt,
            max_attempts=max_iterations
        )
        
        return {
            "old_description": old_description,
            "new_description": validation_result["content"],
            "success": validation_result["success"],
            "warnings": validation_result["errors"] if not validation_result["success"] else [],
            "score": 100 if validation_result["success"] else 50,
            "attempts": validation_result["attempts"],
            "history": validation_result.get("history", [])
        }
    
    def generate_title(
        self,
        subject_name: Optional[str],
        characteristics: List[Dict[str, Any]],
        description: str,
        tech_description: Optional[str] = None,
        old_title: Optional[str] = None,
        max_iterations: int = 3,
    ) -> Dict[str, Any]:
        """Генерация title с СТРОГОЙ валидацией"""
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
        
        print(f"\n🏷️ ГЕНЕРАЦИЯ TITLE")
        result = self._call_openai(system_prompt, base_payload)
        title = result.get("title", "").strip()
        print(f"✅ Сгенерировано: {title}")
        
        validation_result = self.validator.validate_and_fix_loop(
            content=title,
            content_type="title",
            characteristics=characteristics,
            system_prompt=system_prompt,
            max_attempts=max_iterations
        )
        
        return {
            "old_title": old_title,
            "new_title": validation_result["content"],
            "success": validation_result["success"],
            "warnings": validation_result["errors"] if not validation_result["success"] else [],
            "score": 100 if validation_result["success"] else 50,
            "attempts": validation_result["attempts"],
            "history": validation_result.get("history", [])
        }
    
    def _call_openai(
        self,
        system_prompt: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Вызов OpenAI API"""
        
        response = self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False)
                },
            ],
            max_completion_tokens=2048,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Очистка JSON маркеров
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        return json.loads(content)
    
    def _get_fallback_description_prompt(self) -> str:
        """Fallback prompt if DB fails"""
        return """
Ты — генератор ОПИСАНИЯ для Wildberries.

ЦЕЛЬ:
1. Точное понимание товара
2. SEO

ИСТОЧНИКИ:
- tech_description: ТОЧКА ИСТИНЫ
- characteristics
- title

СТРУКТУРА:
1. Вступление (1-2 предложения)
2. Конструкция и посадка (ГЛАВНОЕ)
3. Материалы (если есть)
4. Назначение
5. Особенности

ЗАПРЕЩЕНО:
✗ Маркетинг: лучшее, топ, премиум
✗ Обещания: делает стройнее
✗ Списки, CAPS, эмодзи

ДЛИНА:
- Идеал: 1000-1800
- Приемлемо: 800-2000
- Максимум: 2500

ФОРМАТ: 3-6 абзацев, 2-4 предложения

ОТВЕТ:
{
  "description": "Текст"
}
""".strip()
    
    def _get_fallback_title_prompt(self) -> str:
        """Fallback prompt if DB fails"""
        return """
Ты — генератор TITLE для Wildberries.

СТРОГАЯ ФОРМУЛА:
Категория + Ключевой признак + (Конструктивный элемент) + (Назначение)

ИСТОЧНИКИ:
- subject_name: категория
- tech_description: ТОЧКА ИСТИНЫ
- characteristics: характеристики

ПРАВИЛО ЦВЕТА:
1. Посмотри в characteristics["Цвет"]
2. Если цвет там - НЕ добавляй в title
3. Исключение: цвет - единственная особенность

ЗАПРЕЩЕНО:
✗ Маркетинг: стильный, хит, топ, супер, премиум
✗ Эмоции: красивый, идеальный
✗ Пол: женский, мужской
✗ CAPS, эмодзи, повторы

ЛИМИТЫ:
- Идеал: 35-50 символов
- Максимум: 60 символов

ОТВЕТ:
{
  "title": "Костюм двубортный приталенный"
}
""".strip()