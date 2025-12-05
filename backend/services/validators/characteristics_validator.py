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
            return self._normalize_characteristics(
                refined,
                allowed_values=allowed_values,
                limits=limits
            )

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
        allowed_values: Dict[str, List[str]] | None = None,
    ) -> List[Dict[str, Any]]:

        allowed_values = allowed_values or {}

        for char in characteristics:
            name = char.get("name")
            if "value" not in char:
                char["value"] = []
                continue

            value = char["value"]

            # 1) Avval listga normalizatsiya
            if isinstance(value, str):
                if "," in value:
                    values_list = [
                        v.strip() for v in value.split(",") if v.strip()
                    ]
                else:
                    values_list = [value.strip()] if value.strip() else []
            elif isinstance(value, list):
                values_list = [
                    str(v).strip()
                    for v in value
                    if str(v).strip()
                ]
            elif value is not None:
                v = str(value).strip()
                values_list = [v] if v else []
            else:
                values_list = []

            dict_vals = allowed_values.get(name) or []
            if not dict_vals:
                # dictionary yo'q – erkin matn
                char["value"] = values_list
                continue

            normalized_dict = [str(v).strip() for v in dict_vals if str(v).strip()]
            dict_lower_map = {v.lower(): v for v in normalized_dict}

            mapped: List[str] = []

            for raw in values_list:
                if not raw:
                    continue
                raw_str = str(raw).strip()

                if raw_str in normalized_dict:
                    if raw_str not in mapped:
                        mapped.append(raw_str)
                    continue

                base = raw_str.split("(")[0].split("[")[0].strip()
                base = base.rstrip(" .,-;")

                if base in normalized_dict:
                    if base not in mapped:
                        mapped.append(base)
                    continue

                lower_raw = raw_str.lower()
                lower_base = base.lower()

                if lower_raw in dict_lower_map:
                    val = dict_lower_map[lower_raw]
                    if val not in mapped:
                        mapped.append(val)
                    continue

                if lower_base in dict_lower_map:
                    val = dict_lower_map[lower_base]
                    if val not in mapped:
                        mapped.append(val)
                    continue

                matched = False
                for dv in normalized_dict:
                    if dv.lower() in raw_str.lower():
                        if dv not in mapped:
                            mapped.append(dv)
                        matched = True
                        break
                if matched:
                    continue

                # dictionarydan tashqaridagi qiymat – tashlab yuboramiz

            char["value"] = mapped

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
2. ALLOWED VALUES:
   - Для полей с allowed_values[name] КАЖДОЕ значение ДОЛЖНО быть ровно одним из allowed_values[name].
   - Если значение содержит запятые, скобки или дополнительный текст — это ошибка.
3. LIMITS:
   - min/max количество значений соблюдены?
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
    "Поле 'Назначение' содержит строку с несколькими значениями и скобками, нужно разбить на отдельные значения из allowed_values",
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
2. Для полей с allowed_values[name]:
   - Используй ТОЛЬКО значения из allowed_values[name].
   - Если нужно несколько значений, каждая строка = одно значение из словаря.
   - Никаких запятых и скобок внутри одного элемента.
3. Соблюдай limits (min/max количество значений).
4. Обязательные поля (required) заполняй ВСЕГДА.

ФОРМАТ ОТВЕТА (JSON):
{
  "characteristics": [
    {
      "id": 30000,
      "name": "Назначение",
      "value": ["повседневный", "городской", "вечерний"]
    }
  ]
}

НЕ ДОБАВЛЯЙТЕ КОММЕНТАРИЕВ!
ТОЛЬКО JSON!
""".strip()


    def get_fallback_prompt(self) -> str:
        return self._get_fallback_validation_prompt()
