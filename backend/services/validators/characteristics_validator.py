from typing import List, Dict, Any, Optional
import time

from services.base.openai_service import BaseOpenAIService
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class CharacteristicsValidatorService(BaseOpenAIService):
    def validate_characteristics(
        self,
        characteristics: List[Dict[str, Any]],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        locked_fields: List[str],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
        max_iterations: int = 3,
        log_callback=None,
    ) -> Dict[str, Any]:
        def log(msg: str):
            if log_callback:
                log_callback(msg)

        best_charcs = characteristics
        best_score = 0
        best_iteration = 1
        best_issues: List[str] = []

        current_charcs = characteristics
        consecutive_failures = 0

        locked_fields = locked_fields or []

        for iteration in range(1, max_iterations + 1):
            log(f"📋 Characteristics validation attempt {iteration}/{max_iterations}")

            time.sleep(1)

            try:
                validation = self._validate_single(
                    characteristics=current_charcs,
                    charcs_meta_raw=charcs_meta_raw,
                    limits=limits,
                    allowed_values=allowed_values,
                    locked_fields=locked_fields,
                )

                score = validation["score"]
                issues = validation["issues"]

                log(f"  Score: {score}, Issues: {len(issues)}")

                if score > best_score:
                    best_score = score
                    best_charcs = current_charcs
                    best_iteration = iteration
                    best_issues = issues
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1

                if score >= 85:
                    log(
                        f"✅ Characteristics validation passed (score: {score}) "
                        f"{current_charcs}"
                    )
                    return {
                        "characteristics": current_charcs,
                        "score": score,
                        "iterations": iteration,
                        "issues": [],
                    }

                if consecutive_failures >= 2:
                    log("⚠️ Consecutive failures, using best result")
                    break

                if iteration < max_iterations and issues:
                    log("  Refining characteristics...")
                    time.sleep(1)

                    try:
                        current_charcs = self._refine_characteristics(
                            characteristics=current_charcs,
                            issues=issues,
                            charcs_meta_raw=charcs_meta_raw,
                            limits=limits,
                            allowed_values=allowed_values,
                            locked_fields=locked_fields,
                            detected_colors=detected_colors,
                            fixed_data=fixed_data,
                        )
                    except Exception as e:
                        log(f"  ❌ Refine error: {e}")
                        consecutive_failures += 1
                        if consecutive_failures >= 2:
                            break

            except Exception as e:
                log(f"  ❌ Validation error: {e}")
                consecutive_failures += 1
                if consecutive_failures >= 2:
                    break

        log(
            f"📌 Using best result from iteration {best_iteration} "
            f"(score: {best_score})"
        )
        return {
            "characteristics": best_charcs,
            "score": best_score,
            "iterations": max_iterations,
            "issues": best_issues,
        }

    def _validate_single(
        self,
        characteristics: List[Dict[str, Any]],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        locked_fields: List[str],
    ) -> Dict[str, Any]:
        try:
            system_prompt = self._load_validation_prompt()
            charcs_meta = self._build_charcs_meta(charcs_meta_raw)

            result = self._call_openai(
                system_prompt=system_prompt,
                user_payload={
                    "characteristics": characteristics,
                    "charcs_meta": charcs_meta,
                    "limits": limits,
                    "allowed_values": allowed_values,
                    "locked_fields": locked_fields,
                },
                photo_urls=None,
                max_tokens=4096,
            )

            return {
                "score": result.get("score", 0),
                "issues": result.get("issues", []),
            }
        except Exception as e:
            return {
                "score": 0,
                "issues": [f"Validation error: {str(e)}"],
            }

    def _refine_characteristics(
        self,
        characteristics: List[Dict[str, Any]],
        issues: List[str],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        locked_fields: List[str],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
    ) -> List[Dict[str, Any]]:
        try:
            system_prompt = self._load_refine_prompt()
            charcs_meta = self._build_charcs_meta(charcs_meta_raw)

            result = self._call_openai(
                system_prompt=system_prompt,
                user_payload={
                    "characteristics": characteristics,
                    "issues": issues,
                    "charcs_meta": charcs_meta,
                    "limits": limits,
                    "allowed_values": allowed_values,
                    "locked_fields": locked_fields,
                    "detected_colors": detected_colors,
                    "fixed_data": fixed_data,
                },
                photo_urls=None,
                max_tokens=8192,
            )

            refined = result.get("characteristics", characteristics)
            return self._normalize_characteristics(refined)

        except Exception:
            return characteristics

    def _build_charcs_meta(
        self,
        charcs_meta_raw: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        return [
            {
                "id": c.get("charcID"),
                "name": c.get("name"),
                "required": c.get("required", False),
            }
            for c in charcs_meta_raw
        ]

    def _normalize_characteristics(
        self,
        characteristics: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        for char in characteristics:
            if "value" in char:
                value = char["value"]

                if isinstance(value, str):
                    if "," in value:
                        char["value"] = [
                            v.strip() for v in value.split(",") if v.strip()
                        ]
                    else:
                        char["value"] = [value.strip()] if value.strip() else []
                elif isinstance(value, list):
                    char["value"] = [
                        str(v).strip()
                        for v in value
                        if str(v).strip()
                    ]
                elif value is not None:
                    char["value"] = [str(value)]
                else:
                    char["value"] = []

        return characteristics

    def _load_validation_prompt(self) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("characteristics_validator")
        except Exception:
            return self._get_fallback_validation_prompt()

    def _load_refine_prompt(self) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("characteristics_refiner")
        except Exception:
            return self._get_fallback_refine_prompt()

    def _get_fallback_validation_prompt(self) -> str:
        return """
Ты — валидатор характеристик для Wildberries.

ЗАДАЧА: Проверить корректность характеристик.

ПРОВЕРКИ:
1. ОБЯЗАТЕЛЬНЫЕ (required): заполнены?
2. ALLOWED VALUES: из словарей?
3. LIMITS: min/max соблюдены?
4. LOCKED FIELDS: не изменены?

SCORING:
- 100: Идеально
- 85-100: Очень хорошо
- 70-85: Хорошо
- 50-70: Приемлемо
- <50: Плохо

ФОРМАТ ОТВЕТА (JSON):
{
  "score": 85,
  "issues": [
    "Поле X не заполнено",
    "Значение Y не из словаря"
  ]
}

НЕ ДОБАВЛЯЙТЕ КОММЕНТАРИЕВ!
ТОЛЬКО JSON!
""".strip()

    def _get_fallback_refine_prompt(self) -> str:
        return """
Ты — корректор характеристик для Wildberries.

ЗАДАЧА: Исправить найденные проблемы.

ПРАВИЛА:
1. locked_fields НЕ МЕНЯТЬ!
2. Используй ТОЛЬКО значения из allowed_values
3. Соблюдай limits (min/max)
4. Обязательные поля (required) заполняй ВСЕГДА
5. detected_colors используй для контекста

ФОРМАТ ОТВЕТА (JSON):
{
  "characteristics": [
    {
      "id": 123,
      "name": "Материал",
      "value": ["хлопок"]
    }
  ]
}

НЕ ДОБАВЛЯЙТЕ КОММЕНТАРИЕВ!
ТОЛЬКО JSON!
""".strip()

    def get_fallback_prompt(self) -> str:
        return self._get_fallback_validation_prompt()
