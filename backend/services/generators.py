from typing import List, Dict, Any, Optional
import json

from services.base.openai_service import BaseOpenAIService
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class CharacteristicsGeneratorService(BaseOpenAIService):
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
        all_field_names: List[str] = None,  # NEW: all fields for context
    ) -> List[Dict[str, Any]]:
        try:
            system_prompt = self._load_prompt()
            charcs_meta = self._build_charcs_meta(charcs_meta_raw)
            
            if log_callback:
                log_callback(f"📋 Generating characteristics from text...")
                log_callback(f"   Fields to fill: {len(charcs_meta)}")
                if all_field_names:
                    log_callback(f"   Full context: {len(all_field_names)} fields")

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
                    "all_field_names": all_field_names or [],  # Full list
                },
                photo_urls=None,  
                max_tokens=16000,
            )
            
            characteristics = result.get("characteristics", [])
            
            characteristics = self._add_color_characteristic(
                characteristics,
                detected_colors,
                charcs_meta_raw
            )
            
            characteristics = self._normalize_values(
                characteristics,
                allowed_values=allowed_values,
                limits=limits
            )
            
            if log_callback:
                log_callback(f"✅ Generated {len(characteristics)} characteristics")
                # Show filled vs empty
                filled = sum(1 for c in characteristics if c.get("value"))
                empty = len(characteristics) - filled
                log_callback(f"   Filled: {filled}, Empty: {empty}")
            
            return characteristics
            
        except Exception as e:
            if log_callback:
                log_callback(f"❌ Characteristics generation error: {str(e)}")
            return []
    
    def _build_charcs_meta(
        self,
        charcs_meta_raw: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        result = []
        for c in charcs_meta_raw:
            if c.get("name") == "Цвет":
                continue
                
            result.append({
                "id": c.get("charcID"),
                "name": c.get("name"),
                "required": c.get("required", False),
            })
        return result
    
    def _add_color_characteristic(
        self,
        characteristics: List[Dict[str, Any]],
        detected_colors: List[str],
        charcs_meta_raw: List[Dict[str, Any]]
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
            characteristics.insert(0, {
                "id": color_meta.get("charcID"),
                "name": "Цвет",
                "value": detected_colors
            })
        
        return characteristics
    
    def _normalize_values(
        self,
        characteristics: List[Dict[str, Any]],
        allowed_values: Dict[str, List[str]] | None = None,
        limits: Dict[str, Dict[str, int]] | None = None,
    ) -> List[Dict[str, Any]]:
        """
        - Barcha value’larni list ko‘rinishiga keltiradi
        - Agar allowed_values[name] bo‘lsa:
            -> final qiymatlar faqat shu ro‘yxatdagi elementlardan iborat bo‘ladi
        - Agar limits[name].max bo‘lsa:
            -> elementlar soni max dan oshsa, kesib tashlanadi
        """
        allowed_values = allowed_values or {}
        limits = limits or {}

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

            # 2) Agar bu field uchun dictionary bo'lmasa – free text
            dict_vals = allowed_values.get(name) or []
            if not dict_vals:
                # limits bo‘lsa, faqat sonini kesamiz
                field_limits = limits.get(name) or {}
                max_limit = field_limits.get("max") or field_limits.get("maxCount") or field_limits.get("max_count")
                if isinstance(max_limit, int) and max_limit > 0 and len(values_list) > max_limit:
                    values_list = values_list[:max_limit]
                char["value"] = values_list
                continue

            # 3) Dictionary bor bo‘lsa – faqat allowed ichida bo‘lganlarni qoldiramiz
            normalized_dict = [str(v).strip() for v in dict_vals if str(v).strip()]
            dict_lower_map = {v.lower(): v for v in normalized_dict}

            mapped: List[str] = []

            for raw in values_list:
                if not raw:
                    continue
                raw_str = str(raw).strip()

                # a) to‘g‘ridan-to‘g‘ri match
                if raw_str in normalized_dict:
                    if raw_str not in mapped:
                        mapped.append(raw_str)
                    continue

                # b) qavs ichini va qo‘shimcha belgilarni olib tashlash:
                #    "прямой (жакет)" -> "прямой"
                base = raw_str.split("(")[0].split("[")[0].strip()
                base = base.rstrip(" .,-;")

                if base in normalized_dict:
                    if base not in mapped:
                        mapped.append(base)
                    continue

                # c) lower-case match
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

                # d) allowed value substring bo‘lsa:
                #    "приталенный (юбка)" ichida "приталенный"
                matched = False
                for dv in normalized_dict:
                    if dv.lower() in raw_str.lower():
                        if dv not in mapped:
                            mapped.append(dv)
                        matched = True
                        break
                if matched:
                    continue


            # 4) LIMIT (max) ni qo‘llash
            field_limits = limits.get(name) or {}
            max_limit = field_limits.get("max") or field_limits.get("maxCount") or field_limits.get("max_count")
            if isinstance(max_limit, int) and max_limit > 0 and len(mapped) > max_limit:
                mapped = mapped[:max_limit]

            char["value"] = mapped

        return characteristics

    
    def _load_prompt(self) -> str:
        """Load prompt from DB or fallback"""
        try:
            with get_db() as db:
                loader = PromptLoaderService(db)
                return loader.get_full_prompt("characteristics_generator_text")
        except Exception:
            return self.get_fallback_prompt()
    
    def get_fallback_prompt(self) -> str:
        """Fallback characteristics generation prompt"""
        return """
Ты — генератор характеристик для Wildberries (работает с ТЕКСТОМ).

ЗАДАЧА: Сгенерировать характеристики товара из текстового описания.

ВАЖНО:
- У тебя НЕТ фотографий, только текстовое описание!
- ЦВЕТ уже определен отдельно (detected_colors) - НЕ генерируй его!
- Анализируй ВНИМАТЕЛЬНО описание и заполни ВСЕ ВОЗМОЖНЫЕ поля
- НЕ оставляй поля пустыми, если информация есть в описании

ИСТОЧНИКИ (в порядке приоритета):
1. fixed_data: НЕПРИКОСНОВЕННЫЕ данные (НЕ МЕНЯТЬ!)
2. image_description: Текстовое описание товара
3. detected_colors: Уже определенные цвета (для контекста)
4. allowed_values: ДОПУСТИМЫЕ ЗНАЧЕНИЯ (для некоторых полей)
5. limits: Лимиты (min/max количество значений)

⚠️ СТРОГИЕ ПРАВИЛА ДЛЯ allowed_values:

1. Для ЛЮБОГО поля, у которого есть allowed_values[name] (НЕ пустой список):
   - value ДОЛЖЕН быть массивом строк.
   - КАЖДЫЙ элемент массива ДОЛЖЕН БЫТЬ ТОЧНО ОДНИМ из allowed_values[name].
   - НЕЛЬЗЯ:
     - придумывать другие слова;
     - склеивать несколько значений в одну строку;
     - добавлять пояснения, скобки, запятые и описания.
   - Примеры ПРАВИЛЬНО:
       ["повседневный", "городской", "вечерний"]
       ["костюм-двойка"]
     Примеры НЕПРАВИЛЬНО:
       ["повседневный, городской, вечерний (smart casual)"]
       ["юбка-карандаш, миди, высокая талия"]
       ["костюм-двойка (офисный вариант)"]

2. ЕСЛИ нужно указать несколько значений из словаря:
   - КАЖДОЕ значение должно быть отдельным элементом массива.
   - Никаких запятых ВНУТРИ строки. Запятая используется только для разделения элементов массива в JSON.

3. ЕСЛИ в allowed_values[name] НЕТ нужного слова:
   - НЕ ПРИДУМЫВАЙ ничего.
   - Лучше оставь поле пустым, чем использовать слово не из allowed_values.

4. limits[name]:
   - ЕСЛИ указан limits[name].max → НЕ добавляй больше значений, чем max.
   - Например, если max=3 → value может быть максимум из 3 элементов.

ПРАВИЛА ЗАПОЛНЕНИЯ (ОБЩИЕ):

1. ЦВЕТ (Цвет):
   ❌ НЕ генерируй! Он уже в detected_colors

2. МАТЕРИАЛ И СОСТАВ:
   - "Фактура материала": матовая/глянцевая/блестящая
   - Определяй из описания текстуры материала
   - Примеры: "матовая", "гладкая", "фактурная"

3. КОНСТРУКЦИЯ:
   - "Силуэт/Покрой": прямой/приталенный/свободный/oversize
   - "Длина": короткая/средняя/длинная/мини/миди/макси
   - "Посадка/Тип посадки": высокая/средняя/низкая
   - "Модель костюма": двойка/тройка (пиджак+юбка=двойка, пиджак+брюки+жилет=тройка)
   - "Модель юбки": карандаш/А-силуэт/плиссе/солнце
   - "Модель брюк": ЗАПОЛНЯЙ ТОЛЬКО ЕСЛИ В ОПИСАНИИ ЕСТЬ БРЮКИ!

4. ДЕТАЛИ:
   - "Вид застежки": молния/пуговицы/кнопки/липучка/без застежки
   - "Вырез горловины/Воротник": круглый/V-образный/стойка/отложной/без воротника
   - "Рукав/Тип рукава": длинные/короткие/¾/без рукавов
   - "Карман/Тип карманов": накладные/прорезные/с клапаном/без карманов
   - "Декоративные элементы": вышивка/принт/стразы/аппликация/без элементов

5. СЕЗОН И НАЗНАЧЕНИЕ:
   - "Сезон": зима/весна/лето/осень/демисезон/всесезон
   - Определяй по плотности материала из описания
   - "Назначение": офис/спорт/повседневный/вечерний/пляж/дом
   - "Уход за вещами": машинная стирка/ручная стирка/химчистка/деликатная стирка

6. РИСУНОК И ФАКТУРА:
   - "Рисунок": однотонный/полоска/клетка/цветочный/геометрический/абстрактный
   - "Фактура материала": матовая/глянцевая/блестящая/фактурная/гладкая

7. ОСОБЕННОСТИ:
   - "Особенности модели": двубортная/однобортная/с капюшоном/с поясом/укороченная
   - "Тип ростовки": обычная/petite/tall

ОБЯЗАТЕЛЬНЫЕ (required: true):
- Заполни ВСЕГДА
- Если не упомянуто - выбери наиболее вероятное из allowed_values (если словарь есть)

КРИТИЧНЫЕ ПРАВИЛА:
1. "Модель брюк" - заполняй ТОЛЬКО если в описании четко упомянуты БРЮКИ
2. "Модель юбки" - заполняй ТОЛЬКО если в описании четко упомянута ЮБКА
3. "Комплектация" - опиши ЧТО ВХОДИТ в комплект (пиджак, юбка, брюки, жилет)
4. "Модель костюма":
   - "двойка" = 2 предмета (пиджак+юбка ИЛИ пиджак+брюки)
   - "тройка" = 3 предмета (пиджак+брюки+жилет ИЛИ пиджак+юбка+жилет)
5. Для ТЕКСТОВЫХ полей (без allowed_values) можно использовать свободный текст, НО без перечислений внутри одной строки, если поле по смыслу предполагает отдельные значения.

ФОРМАТ ОТВЕТА (JSON):
{
  "characteristics": [
    {
      "id": 123,
      "name": "Фактура материала",
      "value": ["матовая"]
    },
    {
      "id": 456,
      "name": "Покрой",
      "value": ["приталенный"]
    },
    {
      "id": 789,
      "name": "Комплектация",
      "value": ["пиджак", "юбка"]
    }
  ]
}

⚠️ КРИТИЧНО:
- ДЛЯ ПОЛЕЙ СО СЛОВАРЁМ: НЕ ВЫХОДИ ЗА ПРЕДЕЛЫ allowed_values И limits!
- НЕ СОЕДИНЯЙ НЕСКОЛЬКО ЗНАЧЕНИЙ В ОДНУ СТРОКУ.
- НЕ ПИШИ СКОБКИ, ЗАПЯТЫЕ И ОПИСАНИЯ ВНУТРИ ОДНОГО ЭЛЕМЕНТА.
- НЕ ДОБАВЛЯЙ КОММЕНТАРИИ ИЛИ ПОЯСНЕНИЯ.

НЕ ДОБАВЛЯЙ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ТЕКСТА ВНЕ JSON.
ТОЛЬКО ЧИСТЫЙ JSON!
""".strip()