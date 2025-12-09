from typing import List, Dict, Any, Optional

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
        log_callback=None,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:

        def log(msg: str):
            if log_callback:
                log_callback(msg)

        # Pre-validation: Backend tomonidan qattiq tekshirish
        violations = self._check_strict_violations(
            characteristics, allowed_values, limits
        )

        if violations:
            log("⚠️ PRE-VALIDATION: Qoidalar buzilgan:")
            for v in violations[:5]:
                log(f"   {v}")

        # Normalize qilingan characteristics
        current_charcs = self._normalize_values(
            characteristics,
            allowed_values=allowed_values,
            limits=limits,
        )

        best_result: Dict[str, Any] = {
            "characteristics": current_charcs,
            "score": 0,
            "issues": [],
            "iterations": 0,
        }

        for attempt in range(1, max_attempts + 1):
            try:
                log(f"🔋 Characteristics validation attempt {attempt}/{max_attempts}")

                result = self._validate_single(
                    characteristics=current_charcs,
                    charcs_meta_raw=charcs_meta_raw,
                    limits=limits,
                    allowed_values=allowed_values,
                    locked_fields=locked_fields,
                )

                score = int(result.get("score") or 0)
                issues = result.get("issues") or []

                model_charcs = result.get("characteristics") or current_charcs
                model_charcs = self._normalize_values(
                    model_charcs,
                    allowed_values=allowed_values,
                    limits=limits,
                )

                # Backend tomonidan qo'shimcha tekshirish
                post_violations = self._check_strict_violations(
                    model_charcs, allowed_values, limits
                )

                if post_violations:
                    # Score pasayishi
                    penalty = min(len(post_violations) * 5, 30)
                    score = max(0, score - penalty)
                    issues.extend([f"BACKEND: {v}" for v in post_violations[:3]])
                    log(f"  ⚠️ Backend violations found: -{penalty} score")

                log(f"  Score: {score}, Issues: {len(issues)}")

                if score >= best_result["score"]:
                    best_result = {
                        "characteristics": model_charcs,
                        "score": score,
                        "issues": issues,
                        "iterations": attempt,
                    }

                if score >= 95:
                    break

                current_charcs = model_charcs

            except Exception as e:
                log(f"❌ Validation error on iteration {attempt}: {e}")

        return best_result

    def _check_strict_violations(
        self,
        characteristics: List[Dict[str, Any]],
        allowed_values: Dict[str, List[str]],
        limits: Dict[str, Dict[str, int]],
    ) -> List[str]:
        """
        Backend tomonidan QATTIQ TEKSHIRISH
        """
        violations = []

        for char in characteristics:
            name = char.get("name")
            if not name:
                continue

            value = char.get("value", [])

            # Listga normalizatsiya
            if isinstance(value, str):
                values_list = [value.strip()] if value.strip() else []
            elif isinstance(value, list):
                values_list = [str(v).strip() for v in value if str(v).strip()]
            else:
                values_list = []

            # 1. allowed_values tekshiruvi
            dict_vals = allowed_values.get(name) or []
            if dict_vals:
                normalized_dict = set(str(v).strip().lower() for v in dict_vals)

                for val in values_list:
                    val_lower = val.lower()

                    # Aniq match yoki substring match
                    found = False
                    if val_lower in normalized_dict:
                        found = True
                    else:
                        for dv in dict_vals:
                            if dv.lower() in val_lower or val_lower in dv.lower():
                                found = True
                                break

                    if not found:
                        violations.append(
                            f"{name}: '{val}' yo'q allowed_values ichida"
                        )

            # 2. Limit tekshiruvi
            field_limits = limits.get(name) or {}
            max_limit = (
                field_limits.get("max")
                or field_limits.get("maxCount")
                or field_limits.get("max_count")
            )
            if isinstance(max_limit, int) and max_limit > 0:
                if len(values_list) > max_limit:
                    violations.append(
                        f"{name}: {len(values_list)} > max={max_limit}"
                    )

        return violations

    def _validate_single(
        self,
        characteristics: List[Dict[str, Any]],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        locked_fields: List[str],
    ) -> Dict[str, Any]:
        """AI validatsiya"""

        system_prompt = self._load_prompt()

        charcs_meta = [
            {
                "id": c.get("charcID"),
                "name": c.get("name"),
                "required": bool(c.get("required", False)),
            }
            for c in charcs_meta_raw
            if c.get("name")
        ]

        payload = {
            "characteristics": characteristics,
            "charcs_meta": charcs_meta,
            "limits": limits,
            "allowed_values": allowed_values,
            "locked_fields": locked_fields,
        }

        result = self._call_openai(
            system_prompt=system_prompt,
            user_payload=payload,
            photo_urls=None,
            max_tokens=8000,
        )

        if not isinstance(result, dict):
            raise ValueError("Validator response is not a JSON object")

        if "score" not in result:
            result["score"] = 0

        if "issues" not in result or not isinstance(result.get("issues"), list):
            result["issues"] = []

        if "characteristics" in result and not isinstance(
            result["characteristics"], list
        ):
            result["characteristics"] = characteristics

        return result

    def _normalize_values(
        self,
        characteristics: List[Dict[str, Any]],
        allowed_values: Dict[str, List[str]] | None = None,
        limits: Dict[str, Dict[str, int]] | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Xuddi generatordagi kabi normalizatsiya
        """
        allowed_values = allowed_values or {}
        limits = limits or {}

        for char in characteristics:
            name = char.get("name")
            if "value" not in char:
                char["value"] = []
                continue

            value = char["value"]

            # 1) Listga normalizatsiya
            if isinstance(value, str):
                if "," in value:
                    values_list = [v.strip() for v in value.split(",") if v.strip()]
                else:
                    values_list = [value.strip()] if value.strip() else []
            elif isinstance(value, list):
                values_list = [str(v).strip() for v in value if str(v).strip()]
            elif value is not None:
                v = str(value).strip()
                values_list = [v] if v else []
            else:
                values_list = []

            dict_vals = allowed_values.get(name) or []
            if not dict_vals:
                field_limits = limits.get(name) or {}
                max_limit = (
                    field_limits.get("max")
                    or field_limits.get("maxCount")
                    or field_limits.get("max_count")
                )
                if (
                    isinstance(max_limit, int)
                    and max_limit > 0
                    and len(values_list) > max_limit
                ):
                    values_list = values_list[:max_limit]
                char["value"] = values_list
                continue

            # Dictionary bor - mapping
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

            # Limit
            field_limits = limits.get(name) or {}
            max_limit = (
                field_limits.get("max")
                or field_limits.get("maxCount")
                or field_limits.get("max_count")
            )
            if isinstance(max_limit, int) and max_limit > 0 and len(mapped) > max_limit:
                mapped = mapped[:max_limit]

            char["value"] = mapped

        return characteristics

    def _load_prompt(self) -> str:
        """Promptni DB dan yuklash yoki fallback"""
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("characteristics_validator_text")
        except Exception:
            return self.get_fallback_prompt()

    def get_fallback_prompt(self) -> str:
        """YANGILANGAN: QATTIQ VALIDATOR PROMPT"""
        return """
Ты — валидатор характеристик Wildberries.

🎯 ЗАДАЧА:
1) Проанализировать уже сгенерированные характеристики товара
2) Проверить их СОГЛАСОВАННОСТЬ, ЛОГИЧНОСТЬ и ПОЛНОТУ
3) **КРИТИЧНО**: Проверить СООТВЕТСТВИЕ allowed_values и limits

🚨 КРИТИЧЕСКИЕ ПРОВЕРКИ:

1. ALLOWED_VALUES (СТРОГАЯ ПРОВЕРКА):
   - Для КАЖДОГО поля, где allowed_values НЕ пустой:
     * КАЖДОЕ значение в value ДОЛЖНО быть из allowed_values
     * Если найдено значение НЕ из словаря → СЕРЬЕЗНАЯ ОШИБКА (-20 score)
   
   Пример:
   - allowed_values["Покрой"] = ["прямой", "приталенный", "свободный"]
   - value = ["облегающий"] → ❌ ОШИБКА! "облегающий" нет в словаре

2. LIMITS (СТРОГАЯ ПРОВЕРКА):
   - limits[name].max НЕЛЬЗЯ превышать
   - Если value имеет БОЛЬШЕ элементов чем max → ОШИБКА (-15 score)
   
   Пример:
   - limits["Назначение"].max = 3
   - value = ["офисный", "повседневный", "вечерний", "спортивный"] → ❌ 4 > 3

3. REQUIRED FIELDS:
   - Если required: true И value пустой → КРИТИЧЕСКАЯ ОШИБКА (-25 score)

4. LOCKED_FIELDS:
   - НЕ ДОЛЖНЫ изменяться

SCORING (0-100):
- 95-100: ИДЕАЛЬНО (все правила соблюдены)
- 85-94: ХОРОШО (минимальные проблемы)
- 70-84: СРЕДНЕ (несколько ошибок в allowed_values или limits)
- 50-69: ПЛОХО (много ошибок)
- 0-49: КРИТИЧНО (грубые нарушения allowed_values или limits)

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "score": 85,
  "issues": [
    "Покрой: значение 'облегающий' не найдено в allowed_values",
    "Назначение: 4 значения > max=3",
    "Декоративные элементы: required поле пустое"
  ],
  "characteristics": [...]  // ОПЦИОНАЛЬНО: можешь слегка исправить
}

⚠️ ВАЖНО:
- Если исправляешь characteristics:
  * НЕ ДОБАВЛЯЙ значения вне allowed_values
  * НЕ ПРЕВЫШАЙ limits.max
  * НЕ ТРОГАЙ locked_fields
- Если не уверен → лучше НЕ исправляй, просто опиши в issues

НИКАКОГО ТЕКСТА ВНЕ JSON!
ТОЛЬКО ЧИСТЫЙ JSON!
""".strip()