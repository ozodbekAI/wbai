from typing import Any, Dict, List, Optional
import time

from core.database import get_db
from services.base.openai_service import BaseOpenAIService
from services.promnt_loader import PromptLoaderService


class ColorValidatorService(BaseOpenAIService):
    def validate_colors(
        self,
        detected_colors: List[str],
        image_description: str,
        allowed_colors: Any,
        max_iterations: int = 3,
        log_callback=None,
    ) -> Dict[str, Any]:
        def log(msg: str):
            if log_callback:
                log_callback(msg)

        normalized_allowed = []

        print("\n\n\n\nALLOWED COLORS:", allowed_colors)

        if isinstance(allowed_colors, (list, tuple, set)):
            for v in allowed_colors:
                if isinstance(v, str):
                    normalized_allowed.append(v) 
        else:
            normalized_allowed = []

        normalized_allowed = [
            c.strip()
            for c in normalized_allowed
            if isinstance(c, str) and c.strip()
        ]

        log(f"Allowed colors (normalized) count: {len(normalized_allowed)}")

        best_colors = detected_colors or []
        best_score = 0
        best_iteration = 1

        current_colors = detected_colors or []
        last_validation = {"issues": []}

        for iteration in range(1, max_iterations + 1):
            log(f"🎨 Color validation attempt {iteration}/{max_iterations}")

            validation = self._validate_single(
                colors=current_colors,
                image_description=image_description,
                allowed_colors=normalized_allowed,  
                limits=5
            )
            last_validation = validation

            score = validation.get("score", 0)
            issues = validation.get("issues", [])

            log(f"  Score: {score}, Issues: {len(issues)}")

            if score > best_score:
                best_score = score
                best_colors = current_colors
                best_iteration = iteration

            if score >= 90:
                log(f"✅ Color validation passed (score: {score})")
                return {
                    "colors": current_colors,
                    "score": score,
                    "iterations": iteration,
                    "issues": []
                }

            if iteration < max_iterations and issues:
                log(f"  Refining colors...")
                try:
                    current_colors = self._refine_colors(
                        colors=current_colors,
                        issues=issues,
                        image_description=image_description,
                        allowed_colors=normalized_allowed,  
                        limits=5
                    )
                except Exception as e:
                    log(f"  ❌ Refine error: {e}")
                    break

        log(f"📌 Using best result from iteration {best_iteration} (score: {best_score})")
        return {
            "colors": best_colors,
            "score": best_score,
            "iterations": best_iteration,
            "issues": last_validation.get("issues", []) if best_score < 90 else []
        }

    
    def _validate_single(
        self,
        colors: List[str],
        image_description: str,
        allowed_colors,
        limits,
    ) -> Dict[str, Any]:
        try:
            system_prompt = self._load_validation_prompt()
            
            result = self._call_openai(
                system_prompt=system_prompt,
                user_payload={
                    "colors": colors,
                    "image_description": image_description,
                    "allowed_colors": allowed_colors,
                    "limits": limits
                },
                photo_urls=None,
                max_tokens=4096,
            )

            print("Validation result:", result)
            
            return {
                "score": result.get("score", 0),
                "issues": result.get("issues", [])
            }
        except Exception as e:
            return {
                "score": 0,
                "issues": [f"Validation error: {str(e)}"]
            }

    def _refine_colors(
        self,
        colors: List[str],
        issues: List[str],
        image_description: str,
        allowed_colors: List[str],
        limits: Dict[str, Dict[str, int]]
    ) -> List[str]:
        try:
            system_prompt = self._load_refine_prompt()
            
            result = self._call_openai(
                system_prompt=system_prompt,
                user_payload={
                    "colors": colors,
                    "issues": issues,
                    "image_description": image_description,
                    "allowed_colors": allowed_colors,
                    "limits": limits
                },
                photo_urls=None,
                max_tokens=2048,
            )
            
            refined = result.get("colors", colors)
            if isinstance(refined, list):
                return [str(c).strip() for c in refined if str(c).strip()]
            else:
                return colors
                
        except Exception:
            return colors
    
    def _load_validation_prompt(self) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("color_validator")
        except Exception:
            return self._get_fallback_validation_prompt()
    
    def _load_refine_prompt(self) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("color_refiner")
        except Exception:
            return self._get_fallback_refine_prompt()
    
    def _get_fallback_validation_prompt(self) -> str:

        return """
Ты — валидатор цветов для Wildberries.

ЗАДАЧА: Проверить корректность определенных цветов.

ПРОВЕРКИ:
1. Цвета из allowed_colors?
2. Соответствует limits (min/max)?
3. Соответствует описанию товара?
4. Порядок правильный (основной → дополнительный)?

SCORING:
- 100: Идеально (все проверки пройдены)
- 80-90: Хорошо (мелкие недочеты)
- 60-80: Приемлемо (есть проблемы)
- <60: Плохо (серьезные ошибки)

ФОРМАТ ОТВЕТА (JSON):
{
  "score": 85,
  "issues": [
    "Цвет не из списка",
    "Превышен лимит"
  ]
}

НЕ ДОБАВЛЯЙТЕ КОММЕНТАРИЕВ!
ТОЛЬКО JSON!
""".strip()
    
    def _get_fallback_refine_prompt(self) -> str:
        return """
Ты — корректор цветов для Wildberries.

ЗАДАЧА: Исправить найденные проблемы с цветами.

ПРАВИЛА:
1. Используй ТОЛЬКО цвета из allowed_colors
2. Соблюдай limits (min/max)
3. Основной цвет первый, дополнительные после
4. Цвета должны соответствовать описанию

ФОРМАТ ОТВЕТА (JSON):
{
  "colors": ["черный", "серый"]
}

НЕ ДОБАВЛЯЙТЕ КОММЕНТАРИЕВ!
ТОЛЬКО JSON!
""".strip()
    
    def get_fallback_prompt(self) -> str:
        return self._get_fallback_validation_prompt()
