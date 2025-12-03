from typing import Optional
from sqlalchemy.orm import Session

from repositories.promt_repository import PromptRepository


class PromptLoaderService:

    STATIC_RESPONSE_FORMAT = {
        "title_generator": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "title": "<сгенерированный_title>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "title_validator": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "score": <0-100>,
  "issues": [
    {"type": "<тип_проблемы>", "message": "<конкретное_описание>"}
  ],
  "fix_prompt": "<конкретные_инструкции>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "title_refiner": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "title": "<исправленный_title>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "description_generator": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "description": "<сгенерированное_описание>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "description_validator": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "score": <0-100>,
  "issues": [
    {"type": "<тип_проблемы>", "message": "<конкретное_описание>"}
  ],
  "fix_prompt": "<конкретные_инструкции>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "description_refiner": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "description": "<исправленное_описание>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "characteristics_generator": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "characteristics": [
    {
      "id": <id_характеристики>,
      "name": "<название>",
      "value": "<значение>"
    }
  ]
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "characteristics_validator": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "score": <0-100>,
  "issues": [
    {"type": "<тип_проблемы>", "message": "<конкретное_описание>"}
  ],
  "fix_prompt": "<конкретные_инструкции>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "characteristics_refiner": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "characteristics": [
    {
      "id": <id_характеристики>,
      "name": "<название>",
      "value": "<значение>"
    }
  ]
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
""",
        "color_detector": """
ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "colors": ["<цвет1>", "<цвет2>"],
  "confidence": "<high/medium/low>",
  "notes": "<краткое_пояснение>"
}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ ИЛИ ПОЯСНЕНИЙ!
ТОЛЬКО ЧИСТЫЙ JSON!
"""
    }
    
    STATIC_RULES_COMMON = """
🚫 СТРОГИЕ ЗАПРЕТЫ (КРИТИЧНО):

1. ЗАПРЕЩЕННЫЕ СЛОВА - ПОЛНОСТЬЮ ИСКЛЮЧЕНЫ:
   - Маркетинговые: "стильный", "красивый", "идеальный", "хит", "топ", "супер", "премиум"
   - Эмоциональные: "роскошный", "элегантный", "модный", "актуальный"
   - Обещания эффекта: "делает стройнее", "делает выше"

2. ПОВТОРЫ СЛОВ:
   - В title: НИКАКИХ повторов (каждое слово встречается только 1 раз)
   - В description: не более 3 повторов одного слова

3. ФОРМАТ:
   - Никаких CAPS (заглавных букв кроме первой)
   - Никаких emoji
   - Никаких списков (bullet points, нумерация)
   - Только чистый текст

4. ЦВЕТ В TITLE:
   - Если цвет уже есть в характеристиках - НЕ дублировать в title
   - Исключение: только если цвет является ключевой особенностью модели

⚠️ ВНИМАНИЕ: Если вы используете запрещенные элементы, 
результат будет АВТОМАТИЧЕСКИ ОТКЛОНЕН и перегенерирован!

💡 ЧТО РАЗРЕШЕНО:
   - Только конструктивные факты
   - Нейтральные описания элементов
   - Точные характеристики без эмоций
   - Честная информация о назначении
"""
    
    def __init__(self, db: Session):
        self.repo = PromptRepository(db)
    
    def get_full_prompt(self, prompt_type: str) -> str:
        prompt_template = self.repo.get_active_prompt(prompt_type)
        
        if not prompt_template:
            raise ValueError(f"Промпт типа '{prompt_type}' не найден в БД!")
        
        full_prompt_parts = [
            prompt_template.system_prompt, 
        ]

        if prompt_template.strict_rules:
            full_prompt_parts.append("\n" + prompt_template.strict_rules)
        
        if any(x in prompt_type for x in ["generator", "refiner"]):
            full_prompt_parts.append(self.STATIC_RULES_COMMON)
        
        if prompt_template.examples:
            full_prompt_parts.append("\n📚 ПРИМЕРЫ:\n" + prompt_template.examples)

        response_format = self._get_response_format(prompt_type)
        if response_format:
            full_prompt_parts.append(response_format)
        
        return "\n\n".join(full_prompt_parts)
    
    def _get_response_format(self, prompt_type: str) -> Optional[str]:
        if prompt_type in self.STATIC_RESPONSE_FORMAT:
            return self.STATIC_RESPONSE_FORMAT[prompt_type]

        if "title" in prompt_type.lower():
            if "validator" in prompt_type.lower():
                return self.STATIC_RESPONSE_FORMAT["title_validator"]
            elif "refiner" in prompt_type.lower():
                return self.STATIC_RESPONSE_FORMAT["title_refiner"]
            else:
                return self.STATIC_RESPONSE_FORMAT["title_generator"]
        elif "description" in prompt_type.lower():
            if "validator" in prompt_type.lower():
                return self.STATIC_RESPONSE_FORMAT["description_validator"]
            elif "refiner" in prompt_type.lower():
                return self.STATIC_RESPONSE_FORMAT["description_refiner"]
            else:
                return self.STATIC_RESPONSE_FORMAT["description_generator"]
        elif "characteristic" in prompt_type.lower():
            if "validator" in prompt_type.lower():
                return self.STATIC_RESPONSE_FORMAT["characteristics_validator"]
            elif "refiner" in prompt_type.lower():
                return self.STATIC_RESPONSE_FORMAT["characteristics_refiner"]
            else:
                return self.STATIC_RESPONSE_FORMAT["characteristics_generator"]
        elif "color" in prompt_type.lower():
            return self.STATIC_RESPONSE_FORMAT["color_detector"]
        
        return None
    
    def refresh_prompt(self, prompt_type: str):
        return self.get_full_prompt(prompt_type)