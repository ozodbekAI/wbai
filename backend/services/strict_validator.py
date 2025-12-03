import json
import re
from typing import Dict, Any, List, Tuple
import httpx
from openai import OpenAI
import requests

from core.config import settings


class StrictValidatorService:
    FORBIDDEN_TITLE_WORDS = {
        "стильный", "красивый", "идеальный", "хит", "топ", "супер",
        "премиум", "модный", "актуальный", "элегантный", "роскошный",
        "женский", "мужской", "офисный"
    }

    FORBIDDEN_DESC_WORDS = {
        "стильный", "красивый", "идеальный", "хит", "топ", "супер",
        "премиум", "роскошный", "актуальный", "модный", "элегантный",
        "лучший", "качественный", "делает стройнее", "делает выше"
    }

    def __init__(self):
        # OpenAI client
        if settings.USE_PROXY and settings.PROXY_URL:
            http_client = httpx.Client(
                proxies={
                    "http://": settings.PROXY_URL,
                    "https://": settings.PROXY_URL,
                },
                timeout=180.0,
            )
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client,
            )
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def validate_title_strict(
        self,
        title: str,
        characteristics: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str], int]:
        errors = []
        score = 100
        
        if len(title) > 60:
            errors.append(f"Title слишком длинный: {len(title)} > 60 символов")
            score -= 30 
        
        if len(title) < 20:
            errors.append(f"Title слишком короткий: {len(title)} < 20 символов")
            score -= 20
        elif not (35 <= len(title) <= 50):
            errors.append(f"Длина вне оптимального диапазона 35-50: {len(title)}")
            score -= 10
        
        title_lower = title.lower()
        found_forbidden = []
        for word in self.FORBIDDEN_TITLE_WORDS:
            if word in title_lower:
                found_forbidden.append(word)
        
        if found_forbidden:
            errors.append(f"Запрещенные слова: {', '.join(found_forbidden)}")
            score -= 25  
        
        words = title_lower.split()
        word_counts = {}
        for word in words:
            if len(word) > 3:
                word_counts[word] = word_counts.get(word, 0) + 1
        
        repeated = [w for w, c in word_counts.items() if c > 1]
        if repeated:
            errors.append(f"Повторяющиеся слова: {', '.join(repeated)}")
            score -= 15
        
        colors_in_chars = []
        for char in characteristics:
            if char.get("name") == "Цвет":
                colors_in_chars.extend(char.get("value", []))
        
        for color in colors_in_chars:
            if color.lower() in title_lower:
                errors.append(f"Цвет '{color}' дублируется в title и характеристиках")
                score -= 10
        
        if title.isupper():
            errors.append("Использованы только заглавные буквы (CAPS запрещен)")
            score -= 20
        
        caps_sequence = re.findall(r'[А-ЯЁA-Z]{3,}', title)
        if caps_sequence:
            errors.append(f"CAPS-последовательности: {', '.join(caps_sequence)}")
            score -= 10
        
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"
            u"\U0001F300-\U0001F5FF"
            "]+", flags=re.UNICODE)
        if emoji_pattern.search(title):
            errors.append("Использованы emoji (запрещено)")
            score -= 15
        
        score = max(0, score)
        return len(errors) == 0, errors, score
    
    def validate_description_strict(
        self,
        description: str
    ) -> Tuple[bool, List[str], int]:
        errors = []
        score = 100
        
        # 1. Проверка длины
        if len(description) > 5000:
            errors.append(f"КРИТИЧНО: Описание слишком длинное: {len(description)} > 5000")
            score -= 40  
        
        if len(description) < 500:
            errors.append(f"Описание слишком короткое: {len(description)} < 500")
            score -= 30
        elif not (1000 <= len(description) <= 1800):
            errors.append(f"Длина вне оптимального диапазона 1000-1800: {len(description)}")
            score -= 10
        
        desc_lower = description.lower()
        found_forbidden = []
        for word in self.FORBIDDEN_DESC_WORDS:
            if word in desc_lower:
                found_forbidden.append(word)
        
        if found_forbidden:
            errors.append(f"Запрещенные слова: {', '.join(found_forbidden)}")
            score -= 25  
        
        words = re.findall(r'\b[а-яёa-z]{4,}\b', desc_lower, re.UNICODE)
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        repeated = [(w, c) for w, c in word_counts.items() if c > 3]
        if repeated:
            errors.append(f"Слишком частые повторы: {', '.join([f'{w}({c}x)' for w, c in repeated[:3]])}")
            score -= 15
        
        paragraphs = [p.strip() for p in description.split('\n\n') if p.strip()]
        if len(paragraphs) < 3:
            errors.append(f"Слишком мало параграфов: {len(paragraphs)} < 3")
            score -= 15
        if len(paragraphs) > 6:
            errors.append(f"Слишком много параграфов: {len(paragraphs)} > 6")
            score -= 10

        if re.search(r'^\s*[-*•]\s', description, re.MULTILINE):
            errors.append("Использованы списки/bullet points (запрещено)")
            score -= 20

        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"
            u"\U0001F300-\U0001F5FF"
            "]+", flags=re.UNICODE)
        if emoji_pattern.search(description):
            errors.append("Использованы emoji (запрещено)")
            score -= 15
        
        score = max(0, score)
        return len(errors) == 0, errors, score
    
    def validate_and_fix_loop(
        self,
        content: str,
        content_type: str,
        characteristics: List[Dict[str, Any]],
        system_prompt: str,
        max_attempts: int = 3
    ) -> Dict[str, Any]:

        attempts_history = []
        best_attempt = None
        best_score = -1
        
        for attempt in range(1, max_attempts + 1):
            print(f"🔍 Попытка {attempt}/{max_attempts}: Валидация {content_type}...")

            if content_type == "title":
                is_valid, errors, score = self.validate_title_strict(content, characteristics)
            else:
                is_valid, errors, score = self.validate_description_strict(content)

            attempt_data = {
                "attempt": attempt,
                "content": content,
                "errors": errors,
                "is_valid": is_valid,
                "score": score
            }
            attempts_history.append(attempt_data)
            
            if score > best_score:
                best_score = score
                best_attempt = attempt_data
                print(f"🏆 Новый лучший результат! Score: {score}")
            
            if is_valid:
                return {
                    "success": True,
                    "content": content,
                    "attempts": attempt,
                    "errors": [],
                    "score": score,
                    "history": attempts_history
                }
            
            print(f"❌ Валидация не пройдена. Score: {score}, Ошибки: {'; '.join(errors[:2])}")
            
            if attempt >= 2 and score < 40 and best_score >= 60:
                print(f"⚠️ Score слишком низкий ({score}). Откат к лучшему варианту (score: {best_score})")
                return {
                    "success": False,
                    "content": best_attempt["content"],
                    "attempts": attempt,
                    "errors": best_attempt["errors"],
                    "score": best_score,
                    "history": attempts_history,
                    "rolled_back": True
                }
            
            if attempt < max_attempts:
                print(f"🔄 Перегенерация {content_type} (с историей {len(attempts_history)} попыток)...")
                
                try:
                    content = self._regenerate_content_with_history(
                        content_type=content_type,
                        system_prompt=system_prompt,
                        characteristics=characteristics,
                        attempts_history=attempts_history
                    )
                except Exception as e:
                    print(f"❌ Ошибка перегенерации: {e}")
                    if best_attempt:
                        print(f"📌 Использую лучший вариант из попыток (score: {best_score})")
                        return {
                            "success": False,
                            "content": best_attempt["content"],
                            "attempts": attempt,
                            "errors": best_attempt["errors"],
                            "score": best_score,
                            "history": attempts_history,
                            "rolled_back": True,
                            "api_error": str(e)
                        }
                    return {
                        "success": False,
                        "content": content,
                        "attempts": attempt,
                        "errors": errors,
                        "score": score,
                        "history": attempts_history,
                        "api_error": str(e)
                    }

        
        return {
            "success": False,
            "content": best_attempt["content"],
            "attempts": max_attempts,
            "errors": best_attempt["errors"],
            "score": best_score,
            "history": attempts_history,
            "used_best": True
        }
    
    def _regenerate_content_with_history(
        self,
        content_type: str,
        system_prompt: str,
        characteristics: List[Dict[str, Any]],
        attempts_history: List[Dict[str, Any]]
    ) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        
        history_text = "\n\n".join([
            f"ПОПЫТКА {h['attempt']} (Score: {h['score']}):\n"
            f"Результат: {h['content']}\n"
            f"Ошибки: {'; '.join(h['errors']) if h['errors'] else 'нет'}"
            for h in attempts_history
        ])
        
        last_errors = attempts_history[-1]["errors"]
        critical_errors = [e for e in last_errors if "КРИТИЧНО" in e or "длинный" in e or "Запрещенные" in e]
        
        user_message = f"""
ИСТОРИЯ ПРЕДЫДУЩИХ ПОПЫТОК:
{history_text}

КРИТИЧЕСКИЕ ПРОБЛЕМЫ:
{chr(10).join([f"⚠️ {error}" for error in (critical_errors if critical_errors else last_errors[:3])])}

ЗАДАЧА:
1) Изучи ВСЕ предыдущие попытки и их ошибки
2) Пойми, какие ошибки повторяются
3) Создай СОВЕРШЕННО НОВЫЙ {content_type}, который:
   - ПОЛНОСТЬЮ устраняет ВСЕ указанные проблемы
   - НЕ повторяет ошибки предыдущих попыток
   - Использует ДРУГИЕ формулировки (не копируй!)
   - {"Длина 35-50 символов" if content_type == "title" else "Длина 1000-1800 символов, 3-6 абзацев"}

Характеристики:
{json.dumps(characteristics, ensure_ascii=False)}

⚠️ АБСОЛЮТНЫЙ ПРИОРИТЕТ:
- Запрещенные слова УДАЛИ полностью
- Повторы УСТРАНИ полностью  
- Если слово было в ошибках - НЕ используй его
- {"Каждое слово ОДИН РАЗ" if content_type == "title" else "Слова не чаще 3 раз"}
- {"Без цвета если он есть в характеристиках" if content_type == "title" else "Структура: вступление, конструкция, материал, назначение"}
"""
        
        body = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "max_completion_tokens": 2048 if content_type == "description" else 1024,
            "response_format": {"type": "json_object"},
        }
        
        resp = requests.post(url, headers=headers, json=body, timeout=180)
        
        if resp.status_code != 200:
            raise ValueError(f"OpenAI error {resp.status_code}: {resp.text}")
        
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
        
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        result = json.loads(content)
        return result.get(content_type, "")