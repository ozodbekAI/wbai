from typing import List, Dict, Any, Optional
import json

from services.base.openai_service import BaseOpenAIService
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class CharacteristicsGeneratorService(BaseOpenAIService):
    """
    QATTIQ QOIDALAR bilan generator:
    - allowed_values dan FAQAT ruxsat berilgan qiymatlar
    - limits.max dan HECH QACHON oshmasligi
    - Bo'sh qiymatlar bo'lmasligi (agar allowed_values bo'lsa)
    """

    def generate_characteristics(
        self,
        image_description: str,
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
        subject_name: Optional[str] = None,
        log_callback=None,
        all_field_names: List[str] = None,
    ) -> List[Dict[str, Any]]:
        try:
            system_prompt = self._load_prompt()
            charcs_meta = self._build_charcs_meta(charcs_meta_raw)

            if log_callback:
                log_callback(f"🔋 Generating characteristics from text...")
                log_callback(f"   Fields to fill: {len(charcs_meta)}")
                if all_field_names:
                    log_callback(f"   Full context: {len(all_field_names)} fields")

            # CRITICAL: AI ga aniq qoidalarni yuborish
            strict_instructions = self._build_strict_instructions(
                allowed_values, limits
            )

            result = self._call_openai(
                system_prompt=system_prompt,
                user_payload={
                    "image_description": image_description,
                    "charcs_meta": charcs_meta,
                    "limits": limits,
                    "allowed_values": allowed_values,
                    "detected_colors": detected_colors,
                    "fixed_data": fixed_data,
                    "subject_name": subject_name,
                    "all_field_names": all_field_names or [],
                    "strict_instructions": strict_instructions,  # YANGI
                },
                photo_urls=None,
                max_tokens=16000,
            )

            characteristics = result.get("characteristics", [])

            characteristics = self._add_color_characteristic(
                characteristics, detected_colors, charcs_meta_raw
            )

            # YANGI: Qattiq validatsiya va tuzatish
            characteristics = self._enforce_strict_rules(
                characteristics,
                allowed_values=allowed_values,
                limits=limits,
                log_callback=log_callback,
            )

            if log_callback:
                log_callback(f"✅ Generated {len(characteristics)} characteristics")
                filled = sum(1 for c in characteristics if c.get("value"))
                empty = len(characteristics) - filled
                log_callback(f"   Filled: {filled}, Empty: {empty}")

            return characteristics

        except Exception as e:
            if log_callback:
                log_callback(f"❌ Characteristics generation error: {str(e)}")
            return []

    def _build_strict_instructions(
        self,
        allowed_values: Dict[str, List[str]],
        limits: Dict[str, Dict[str, int]],
    ) -> Dict[str, Any]:
        """
        Har bir field uchun QATTIQ QOIDALAR
        """
        instructions = {}

        for field_name, values in allowed_values.items():
            if not values:
                continue

            field_limits = limits.get(field_name, {})
            max_count = (
                field_limits.get("max")
                or field_limits.get("maxCount")
                or field_limits.get("max_count")
                or len(values)
            )

            instructions[field_name] = {
                "allowed_values": values[:50],  # Faqat birinchi 50 ta
                "max_count": max_count,
                "rule": f"FAQAT {len(values[:50])} ta qiymatdan tanlash mumkin. Maksimum {max_count} ta.",
            }

        return instructions

    def _enforce_strict_rules(
        self,
        characteristics: List[Dict[str, Any]],
        allowed_values: Dict[str, List[str]],
        limits: Dict[str, Dict[str, int]],
        log_callback=None,
    ) -> List[Dict[str, Any]]:
        """
        MAJBURIY TUZATISH: AI qoidalarni buzgan bo'lsa, backend tuzatadi
        """

        def log(msg: str):
            if log_callback:
                log_callback(msg)

        violations = []

        for char in characteristics:
            name = char.get("name")
            if not name:
                continue

            value = char.get("value", [])

            # 1. Listga normalizatsiya (eski kod)
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

            # 2. allowed_values tekshiruvi
            dict_vals = allowed_values.get(name) or []
            if not dict_vals:
                # Free text field - faqat limitni tekshirish
                field_limits = limits.get(name) or {}
                max_limit = (
                    field_limits.get("max")
                    or field_limits.get("maxCount")
                    or field_limits.get("max_count")
                )
                if isinstance(max_limit, int) and max_limit > 0:
                    if len(values_list) > max_limit:
                        violations.append(
                            f"⚠️ {name}: {len(values_list)} > {max_limit} (kesib tashlandi)"
                        )
                        values_list = values_list[:max_limit]
                char["value"] = values_list
                continue

            # 3. Dictionary mavjud - QATTIQ TEKSHIRISH
            normalized_dict = [str(v).strip() for v in dict_vals if str(v).strip()]
            dict_lower_map = {v.lower(): v for v in normalized_dict}

            mapped: List[str] = []
            invalid_values: List[str] = []

            for raw in values_list:
                if not raw:
                    continue
                raw_str = str(raw).strip()

                matched = False

                # a) To'g'ridan-to'g'ri match
                if raw_str in normalized_dict:
                    if raw_str not in mapped:
                        mapped.append(raw_str)
                    matched = True
                    continue

                # b) Qavs va qo'shimcha belgilarni olib tashlash
                base = raw_str.split("(")[0].split("[")[0].strip()
                base = base.rstrip(" .,-;")

                if base in normalized_dict:
                    if base not in mapped:
                        mapped.append(base)
                    matched = True
                    continue

                # c) Lower-case match
                lower_raw = raw_str.lower()
                lower_base = base.lower()

                if lower_raw in dict_lower_map:
                    val = dict_lower_map[lower_raw]
                    if val not in mapped:
                        mapped.append(val)
                    matched = True
                    continue

                if lower_base in dict_lower_map:
                    val = dict_lower_map[lower_base]
                    if val not in mapped:
                        mapped.append(val)
                    matched = True
                    continue

                # d) Substring match
                for dv in normalized_dict:
                    if dv.lower() in raw_str.lower():
                        if dv not in mapped:
                            mapped.append(dv)
                        matched = True
                        break

                # Agar hech narsa topilmasa - INVALID
                if not matched:
                    invalid_values.append(raw_str)

            # VIOLATION xabarlari
            if invalid_values:
                violations.append(
                    f"❌ {name}: Noto'g'ri qiymatlar o'chirildi: {', '.join(invalid_values[:3])}"
                )

            # 4. LIMIT tekshiruvi
            field_limits = limits.get(name) or {}
            max_limit = (
                field_limits.get("max")
                or field_limits.get("maxCount")
                or field_limits.get("max_count")
            )
            if isinstance(max_limit, int) and max_limit > 0:
                if len(mapped) > max_limit:
                    violations.append(
                        f"⚠️ {name}: {len(mapped)} > {max_limit} (kesib tashlandi)"
                    )
                    mapped = mapped[:max_limit]

            char["value"] = mapped

        # VIOLATION loglar
        if violations:
            log("⚠️ QOIDALAR BUZILGAN (tuzatildi):")
            for v in violations[:10]:
                log(f"   {v}")
            if len(violations) > 10:
                log(f"   ... va yana {len(violations) - 10} ta")

        return characteristics

    def _build_charcs_meta(
        self, charcs_meta_raw: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        result = []
        for c in charcs_meta_raw:
            if c.get("name") == "Цвет":
                continue

            result.append(
                {
                    "id": c.get("charcID"),
                    "name": c.get("name"),
                    "required": c.get("required", False),
                }
            )
        return result

    def _add_color_characteristic(
        self,
        characteristics: List[Dict[str, Any]],
        detected_colors: List[str],
        charcs_meta_raw: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if not detected_colors:
            return characteristics

        color_meta = None
        for meta in charcs_meta_raw:
            if meta.get("name") == "Цвет":
                color_meta = meta
                break

        if not color_meta:
            return characteristics

        has_color = any(ch.get("name") == "Цвет" for ch in characteristics)

        if not has_color:
            characteristics.insert(
                0,
                {
                    "id": color_meta.get("charcID"),
                    "name": "Цвет",
                    "value": detected_colors,
                },
            )

        return characteristics

    def _load_prompt(self) -> str:
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("characteristics_generator_text")
        except Exception:
            return self.get_fallback_prompt()

    def get_fallback_prompt(self) -> str:
        """YANGILANGAN: QATTIQ QOIDALAR bilan prompt"""
        return """
Ты — генератор характеристик для Wildberries.

🚨 КРИТИЧНЫЕ ПРАВИЛА (БЕЗ ИСКЛЮЧЕНИЙ):

1. ДЛЯ ПОЛЕЙ СО СЛОВАРЕМ (allowed_values НЕ пустой):
   - value ДОЛЖЕН быть массивом строк
   - КАЖДЫЙ элемент ДОЛЖЕН ТОЧНО СОВПАДАТЬ с одним из allowed_values
   - ЗАПРЕЩЕНО:
     * Придумывать новые слова
     * Склеивать несколько значений в одну строку через запятую
     * Добавлять пояснения, скобки, описания
     * Использовать слова НЕ из allowed_values
   
   ✅ ПРАВИЛЬНО:
   ["повседневный", "офисный"]
   ["прямой"]
   
   ❌ НЕПРАВИЛЬНО:
   ["повседневный, офисный, вечерний"]  # Запятая внутри строки!
   ["деловой стиль"]  # Нет в словаре!
   ["офисный (для работы)"]  # Пояснения запрещены!

2. ЛИМИТЫ (limits[name].max):
   - Если max=1 → массив из ОДНОГО элемента
   - Если max=3 → максимум ТРИ элемента
   - НИКОГДА не превышать max
   
   Пример: если "Покрой" max=1 и allowed_values=["прямой", "приталенный"]
   → value МОЖЕТ быть ["прямой"] или ["приталенный"]
   → НЕ МОЖЕТ быть ["прямой", "приталенный"]

3. ОБЯЗАТЕЛЬНЫЕ ПОЛЯ (required: true):
   - НЕ ОСТАВЛЯТЬ пустыми
   - Если инфо нет → выбрать НАИБОЛЕЕ ВЕРОЯТНОЕ из allowed_values

4. ТЕКСТОВЫЕ ПОЛЯ (allowed_values пустой или отсутствует):
   - Можно использовать свободный текст
   - НО соблюдать limits.max для количества элементов

🎯 АЛГОРИТМ ЗАПОЛНЕНИЯ:

ШАГ 1: Прочитай image_description
ШАГ 2: Для КАЖДОГО поля в charcs_meta:
  a) Проверь: есть ли allowed_values[name]?
  b) Если ДА:
     - Найди в описании упоминания
     - Выбери ТОЛЬКО из allowed_values
     - Соблюдай limits[name].max
  c) Если НЕТ:
     - Используй свободный текст
     - Соблюдай limits[name].max для количества элементов

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "characteristics": [
    {
      "id": 123,
      "name": "Покрой",
      "value": ["прямой"]
    },
    {
      "id": 456,
      "name": "Назначение",
      "value": ["офисный", "повседневный", "вечерний"]
    },
    {
      "id": 789,
      "name": "Комплектация",
      "value": ["пиджак", "брюки"]
    }
  ]
}

⚠️ ЕСЛИ СОМНЕВАЕШЬСЯ:
- Лучше ПРОПУСТИТЬ поле (value: []), чем использовать слово НЕ из словаря
- Лучше МЕНЬШЕ значений, чем превысить max

НИКАКИХ КОММЕНТАРИЕВ ИЛИ ТЕКСТА ВНЕ JSON!
ТОЛЬКО ЧИСТЫЙ JSON!
""".strip()