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
            
            characteristics = self._normalize_values(characteristics)
            
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
        characteristics: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        for char in characteristics:
            if "value" in char:
                value = char["value"]
                
                if isinstance(value, str):
                    if "," in value:
                        char["value"] = [v.strip() for v in value.split(",") if v.strip()]
                    else:
                        char["value"] = [value.strip()] if value.strip() else []
                elif isinstance(value, list):
                    char["value"] = [str(v).strip() for v in value if str(v).strip()]
                elif value is not None:
                    char["value"] = [str(value)]
                else:
                    char["value"] = []
        
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
4. allowed_values: Допустимые значения (выбирай ТОЛЬКО из них!)
5. limits: Лимиты (min/max количество значений)

ПРАВИЛА ЗАПОЛНЕНИЯ:

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
- Если не упомянуто - выбери наиболее вероятное из allowed_values

КРИТИЧНЫЕ ПРАВИЛА:
1. "Модель брюк" - заполняй ТОЛЬКО если в описании четко упомянуты БРЮКИ
2. "Модель юбки" - заполняй ТОЛЬКО если в описании четко упомянута ЮБКА
3. "Комплектация" - опиши ЧТО ВХОДИТ в комплект (пиджак, юбка, брюки, жилет)
4. "Модель костюма":
   - "двойка" = 2 предмета (пиджак+юбка ИЛИ пиджак+брюки)
   - "тройка" = 3 предмета (пиджак+брюки+жилет ИЛИ пиджак+юбка+жилет)
5. Для ТЕКСТОВЫХ полей (без allowed_values) генерируй свободный текст

ПРИМЕР ЛОГИКИ:
Описание: "Костюм: пиджак и юбка"
→ "Комплектация": ["пиджак", "юбка"]
→ "Модель костюма": ["двойка"]
→ "Модель юбки": ["карандаш"] (если описана)
→ "Модель брюк": [] (НЕ заполняй - брюк нет!)

Описание: "двубортная застежка с пуговицами"
→ "Вид застежки": ["пуговицы"]
→ "Особенности модели": ["двубортная"]

Описание: "матовая ткань без блеска"
→ "Фактура материала": ["матовая"]

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
- Заполняй МАКСИМУМ полей из описания
- НЕ оставляй пустыми, если информация есть
- Будь внимателен к деталям в тексте
- НЕ придумывай то, чего нет в описании

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""".strip()