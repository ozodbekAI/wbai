import json
import time
from typing import Dict, Any, List, Optional
from openai import OpenAI
import httpx

from core.config import settings
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class GPTService:
    """OpenAI GPT service with proxy support and DB prompts"""
    
    def __init__(self):
        # Proxy bilan yoki proxy'siz client yaratish
        if settings.USE_PROXY and settings.PROXY_URL:
            http_client = httpx.Client(
                proxies={
                    "http://": settings.PROXY_URL,
                    "https://": settings.PROXY_URL,
                },
                timeout=180.0
            )
            self.client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def load_limits(self) -> Dict[str, Dict[str, int]]:
        """Load limits dictionary"""
        limits_path = settings.DATA_DIR / "Справочник лимитов.json"
        with limits_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    
    def load_generator_dict(self) -> Dict[str, List[str]]:
        """Load generator dictionary"""
        gen_dict_path = settings.DATA_DIR / "Справочник генерация.json"
        with gen_dict_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    
    def build_allowed_values(
        self,
        charcs_meta: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """Build allowed values from metadata"""
        generator_dict = self.load_generator_dict()
        name_set = {c["name"] for c in charcs_meta if "name" in c}
        
        allowed = {}
        for name in name_set:
            if name in generator_dict:
                allowed[name] = generator_dict[name]
        
        return allowed
    
    def generate_characteristics(
        self,
        photo_urls: List[str],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
        subject_name: Optional[str] = None,
        fix_prompt: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate characteristics using OpenAI with DB prompt"""
        
        # Load prompt from DB
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                system_prompt = prompt_loader.get_full_prompt("characteristics_generator")
        except Exception as e:
            print(f"⚠️ Ошибка загрузки промпта characteristics_generator: {e}")
            system_prompt = self._get_fallback_characteristics_prompt()
        
        charcs_meta = self._build_charcs_meta_for_prompt(charcs_meta_raw)
        
        user_payload = {
            "charcs_meta": charcs_meta,
            "limits": limits,
            "allowed_values": allowed_values,
            "detected_colors": detected_colors,
            "fixed_data": fixed_data,
        }
        
        if subject_name:
            user_payload["subject_name"] = subject_name
        
        if fix_prompt:
            user_payload["fix_prompt"] = fix_prompt
        
        result = self._call_openai(
            system_prompt,
            user_payload,
            photo_urls=photo_urls,
            max_photos=3,
        )
        
        if "characteristics" not in result:
            raise ValueError("OpenAI result missing 'characteristics'")
        
        # ✅ FIX: Normalize values to arrays
        characteristics = result["characteristics"]
        for char in characteristics:
            if "value" in char:
                value = char["value"]
                
                # Если value - строка с запятыми, разбиваем на массив
                if isinstance(value, str):
                    if "," in value:
                        char["value"] = [v.strip() for v in value.split(",") if v.strip()]
                    else:
                        char["value"] = [value.strip()] if value.strip() else []
                
                # Если value уже массив - оставляем как есть
                elif isinstance(value, list):
                    char["value"] = [str(v).strip() for v in value if str(v).strip()]
                
                # Если value - число или другое
                elif value is not None:
                    char["value"] = [str(value)]
                else:
                    char["value"] = []
        
        return characteristics
    
    def _build_charcs_meta_for_prompt(
        self,
        charcs_meta: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Build simplified metadata for prompt"""
        result = []
        for c in charcs_meta:
            result.append({
                "id": c.get("charcID"),
                "name": c.get("name"),
                "maxCount": c.get("maxCount"),
                "required": c.get("required", False),
            })
        return result
    
    def _call_openai(
        self,
        system_prompt: str,
        user_payload: Dict[str, Any],
        photo_urls: List[str] = None,
        max_photos: int = 3,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Call OpenAI API with retry logic and error handling"""
        
        # Prepare messages
        user_content = [
            {
                "type": "text",
                "text": json.dumps(user_payload, ensure_ascii=False)
            }
        ]
        
        if photo_urls:
            for photo_url in photo_urls[:max_photos]:
                user_content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": photo_url,
                        "detail": "high"
                    }
                })
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    max_completion_tokens=4096,
                )
                
                content = response.choices[0].message.content.strip()
                break
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                # Rate limit or temporary error - retry with backoff
                if ("rate_limit" in error_str or "429" in error_str or "timeout" in error_str) and attempt < max_retries - 1:
                    wait_time = 2.0 * (2 ** attempt)
                    print(f"⚠️ API error, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                
                # Fatal error or last attempt
                if attempt == max_retries - 1:
                    raise ValueError(f"OpenAI error after {max_retries} attempts: {str(e)}")
        
        if last_error and attempt == max_retries - 1:
            raise ValueError(f"OpenAI error: {str(last_error)}")
        
        # Clean markdown
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse OpenAI response as JSON: {e}\nContent: {content[:500]}")
    
    def _get_fallback_characteristics_prompt(self) -> str:
        """Fallback prompt if DB fails"""
        return """
Ты — генератор характеристик Wildberries.

ДАННЫЕ:
- Фото: источник истины
- subject_name
- charcs_meta, limits, allowed_values
- detected_colors
- fixed_data: НЕ МЕНЯТЬ!

ПРАВИЛА ЦВЕТА:
1. Используй detected_colors
2. Можешь добавить 1-2
3. Соблюдай limits

ОТВЕТ:
{
  "characteristics": [
    {"id": 1, "name": "Цвет", "value": ["черный"]}
  ]
}
""".strip()