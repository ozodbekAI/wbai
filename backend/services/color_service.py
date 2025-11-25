import json
import time
from typing import List, Dict, Any
from openai import OpenAI
import httpx

from core.config import settings
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class ColorService:
    
    def __init__(self):
        # Proxy bilan yoki proxy'siz client yaratish
        if settings.USE_PROXY and settings.PROXY_URL:
            http_client = httpx.Client(
                proxies={
                    "http://": settings.PROXY_URL,
                    "https://": settings.PROXY_URL,
                },
                timeout=120.0
            )
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def detect_colors(
        self,
        photo_urls: List[str],
        allowed_values: Dict[str, List[str]],
        log_callback=None,
    ) -> List[str]:
        """Detect colors from photos"""
        color_field_name = "Цвет"
        
        if color_field_name not in allowed_values:
            if log_callback:
                log_callback("⚠️ No color field in allowed_values")
            return []
        
        if not photo_urls:
            if log_callback:
                log_callback("⚠️ No photo URLs provided")
            return []
        
        try:
            limits_path = settings.DATA_DIR / "Справочник лимитов.json"
            with limits_path.open("r", encoding="utf-8") as f:
                limits = json.load(f)
            
            max_colors = min(5, limits.get(color_field_name, {}).get("max", 5))
            
            if log_callback:
                log_callback(f"🎨 Detecting colors (max: {max_colors})...")
            
            detected = self._detect_colors_api(
                photo_urls=photo_urls,
                allowed_colors=allowed_values[color_field_name],
                max_colors=max_colors,
                log_callback=log_callback
            )
            
            if log_callback:
                if detected:
                    log_callback(f"✅ Colors detected ({len(detected)}): {', '.join(detected)}")
                else:
                    log_callback("⚠️ No colors detected")
            
            return detected
            
        except Exception as e:
            if log_callback:
                log_callback(f"❌ Color detection error: {str(e)}")
            return []
    
    def _detect_colors_api(
        self,
        photo_urls: List[str],
        allowed_colors: List[str],
        max_colors: int = 5,
        max_retries: int = 3,
        log_callback=None
    ) -> List[str]:
        """Call OpenAI API to detect colors"""
        max_colors = min(5, max_colors)
        
        # Load prompt from DB
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                system_prompt = prompt_loader.get_full_prompt("color_detector")
        except Exception as e:
            if log_callback:
                log_callback(f"⚠️ Using fallback prompt: {str(e)}")
            system_prompt = self._get_fallback_color_prompt()
        
        # Prepare user payload
        user_payload = {
            "allowed_colors": allowed_colors,
            "max_colors": max_colors,
        }
        
        user_content = [
            {
                "type": "text",
                "text": json.dumps(user_payload, ensure_ascii=False, indent=2)
            }
        ]

        # Add first photo only
        for photo_url in photo_urls[:1]:
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": photo_url,
                    "detail": "high"
                }
            })
        
        last_error = None
        content = None
        
        # Retry loop
        for attempt in range(max_retries):
            try:
                if log_callback and attempt > 0:
                    log_callback(f"   Retry {attempt + 1}/{max_retries}...")
                
                response = self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    max_completion_tokens=1024,
                )
                
                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Empty response from OpenAI")
                
                content = content.strip()
                break
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                if log_callback:
                    log_callback(f"   Error: {str(e)[:100]}")
                
                if ("rate_limit" in error_str or "429" in error_str or "timeout" in error_str) and attempt < max_retries - 1:
                    wait_time = 2.0 * (2 ** attempt)
                    if log_callback:
                        log_callback(f"   Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                
                if attempt == max_retries - 1:
                    if log_callback:
                        log_callback(f"❌ Failed after {max_retries} attempts")
                    return []
        
        # If no content after retries
        if not content:
            if log_callback:
                log_callback(f"❌ No response from OpenAI: {last_error}")
            return []
        
        # Clean markdown formatting
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        # Parse JSON
        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            if log_callback:
                log_callback(f"❌ Invalid JSON response: {str(e)}")
                log_callback(f"   Raw content: {content[:200]}")
            return []
        
        # Validate response structure
        if not isinstance(result, dict):
            if log_callback:
                log_callback(f"❌ Response is not a dict: {type(result)}")
            return []
        
        if "colors" not in result:
            if log_callback:
                log_callback(f"❌ Missing 'colors' field in response")
                log_callback(f"   Available fields: {list(result.keys())}")
            return []
        
        if not isinstance(result["colors"], list):
            if log_callback:
                log_callback(f"❌ 'colors' is not a list: {type(result['colors'])}")
            return []
        
        # Filter and validate colors
        detected = []
        for color in result["colors"]:
            if not isinstance(color, str):
                continue
            
            color = color.strip()
            if color in allowed_colors and color not in detected:
                detected.append(color)
                if len(detected) >= min(5, max_colors):
                    break
        
        return detected
    
    def _get_fallback_color_prompt(self) -> str:
        """Fallback prompt if DB fails"""
        return """
Ты — детектор цветов для товаров Wildberries.

ЗАДАЧА: Определить цвета товара на фотографии.

ВХОДНЫЕ ДАННЫЕ:
- allowed_colors: список разрешенных названий цветов
- max_colors: максимальное количество цветов (обычно 1-5)
- Изображение товара

ПРАВИЛА:
1. Анализируй ТОЛЬКО сам товар (не фон, не упаковку)
2. Выбирай ТОЛЬКО из списка allowed_colors
3. Начни с основного/доминирующего цвета
4. Затем добавь дополнительные цвета (если есть)
5. Цвета должны быть реально видны на товаре
6. Порядок важен: от основного к второстепенному

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "colors": ["черный", "серый"],
  "confidence": "high",
  "notes": "Основной цвет черный, серые вставки"
}

ПРИМЕРЫ:
Запрос: allowed_colors: ["черный", "белый", "серый"], max_colors: 2
Товар: Черная футболка с белым логотипом
Ответ: {"colors": ["черный", "белый"], "confidence": "high", "notes": "Доминирует черный"}

Запрос: allowed_colors: ["синий", "голубой", "белый"], max_colors: 1
Товар: Синие джинсы
Ответ: {"colors": ["синий"], "confidence": "high", "notes": "Однотонный синий"}

НЕ ДОБАВЛЯЙТЕ НИКАКИХ КОММЕНТАРИЕВ КРОМЕ JSON!
ТОЛЬКО ЧИСТЫЙ JSON В УКАЗАННОМ ФОРМАТЕ!
""".strip()