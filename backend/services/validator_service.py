import json
import time
from typing import Dict, Any, List, Optional, Callable
from openai import OpenAI
import httpx

from core.config import settings
from core.database import get_db
from services.promnt_loader import PromptLoaderService


class ValidatorService:
    
    def __init__(self):
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
    
    def validate_with_iterations(
        self,
        photo_urls: List[str],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        initial_charcs: List[Dict[str, Any]],
        locked_fields: List[str],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
        fixed_row: Dict[str, Any],
        subject_name: Optional[str],
        log_callback: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:

        def log(msg: str):
            if log_callback:
                log_callback(msg)
        
        best_score = None
        best_charcs = initial_charcs
        best_issues = []
        best_fix_prompt = ""
        best_iteration = 1
        
        current_charcs = initial_charcs
        iteration = 1
        consecutive_failures = 0  
        
        try:
            with get_db() as db:
                prompt_loader = PromptLoaderService(db)
                validator_prompt = prompt_loader.get_full_prompt("characteristics_validator")
                refiner_prompt = prompt_loader.get_full_prompt("characteristics_refiner")
        except Exception as e:
            log(f"⚠️ Ошибка загрузки промптов: {e}")
            validator_prompt = self._get_fallback_validator_prompt()
            refiner_prompt = self._get_fallback_refiner_prompt()
        
        while iteration <= settings.MAX_ITERATIONS:
            time.sleep(1)
            
            try:
                validation_result = self._validate_characteristics(
                    photo_urls=photo_urls,
                    charcs_meta_raw=charcs_meta_raw,
                    limits=limits,
                    allowed_values=allowed_values,
                    characteristics=current_charcs,
                    locked_fields=locked_fields,
                    subject_name=subject_name,
                    validator_prompt=validator_prompt,
                )
                
                score = validation_result.get("score")
                fix_prompt = validation_result.get("fix_prompt", "")
                validation_issues = validation_result.get("issues", [])
                
                log(f"📊 Score: {score}")
                
                if score is not None and (best_score is None or score > best_score):
                    best_score = score
                    best_charcs = current_charcs
                    best_issues = validation_issues
                    best_fix_prompt = fix_prompt
                    best_iteration = iteration
                    consecutive_failures = 0  # Сброс счетчика
                    log(f"🏆 New best! Score: {best_score} (iteration {iteration})")
                elif score is not None and score < best_score - 10:
                    consecutive_failures += 1
                    log(f"⚠️ Score ухудшился ({consecutive_failures} раз подряд)")
                
                # Если 2 раза подряд score ухудшается - откат к лучшему
                if consecutive_failures >= 2:
                    log(f"🔄 Score ухудшается {consecutive_failures} раз. Откат к лучшему варианту (iteration {best_iteration})")
                    break
                
                if score is not None and score >= settings.SCORE_OK_THRESHOLD:
                    log(f"✅ Threshold reached (score: {score} >= {settings.SCORE_OK_THRESHOLD})")
                    break

                if iteration < settings.MAX_ITERATIONS:
                    
                    time.sleep(2)
                    
                    try:
                        refined = self._refine_characteristics(
                            photo_urls=photo_urls,
                            charcs_meta_raw=charcs_meta_raw,
                            limits=limits,
                            allowed_values=allowed_values,
                            characteristics=current_charcs,
                            locked_fields=locked_fields,
                            detected_colors=detected_colors,
                            fixed_data=fixed_data,
                            fix_prompt=fix_prompt,
                            subject_name=subject_name,
                            refiner_prompt=refiner_prompt,
                        )

                        from services.pipeline_service import PipelineService
                        pipeline = PipelineService()
                        current_charcs = pipeline._override_with_fixed(
                            refined, charcs_meta_raw, fixed_row
                        )
                    except Exception as e:
                        log(f"❌ Refinement error: {e}")
                        consecutive_failures += 1
                        if consecutive_failures >= 2:
                            log(f"🔄 Слишком много ошибок. Использую лучший вариант.")
                            break
                else:
                    log(f"⚠️ Iteration limit ({settings.MAX_ITERATIONS})")
                    break
                    
            except Exception as e:
                log(f"❌ Validation error: {e}")
                consecutive_failures += 1
                if consecutive_failures >= 2:
                    log(f"🔄 Слишком много ошибок. Использую лучший вариант.")
                    break
            
            iteration += 1
        
        if best_iteration < iteration:
            log(f"📌 Using result from iteration {best_iteration} (best score: {best_score})")
        
        return {
            "characteristics": best_charcs,
            "score": best_score,
            "issues": best_issues,
            "fix_prompt": best_fix_prompt,
            "iterations_done": iteration,
            "best_iteration": best_iteration,
        }
    
    def _validate_characteristics(
        self,
        photo_urls: List[str],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        characteristics: List[Dict[str, Any]],
        locked_fields: List[str],
        subject_name: Optional[str],
        validator_prompt: str,
    ) -> Dict[str, Any]:
        charcs_meta = self._build_charcs_meta_for_prompt(charcs_meta_raw)
        
        payload = {
            "charcs_meta": charcs_meta,
            "limits": limits,
            "allowed_values": allowed_values,
            "characteristics": characteristics,
            "locked_fields": locked_fields,
        }
        
        if subject_name:
            payload["subject_name"] = subject_name
        
        result = self._call_openai(
            validator_prompt,
            payload,
            photo_urls=photo_urls,
            max_photos=1,
        )
        
        if "score" not in result or "fix_prompt" not in result:
            raise ValueError("Validator result missing 'score' or 'fix_prompt'")
        
        return result
    
    def _refine_characteristics(
        self,
        photo_urls: List[str],
        charcs_meta_raw: List[Dict[str, Any]],
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        characteristics: List[Dict[str, Any]],
        locked_fields: List[str],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
        fix_prompt: str,
        subject_name: Optional[str],
        refiner_prompt: str,
    ) -> List[Dict[str, Any]]:
        charcs_meta = self._build_charcs_meta_for_prompt(charcs_meta_raw)
        
        payload = {
            "charcs_meta": charcs_meta,
            "limits": limits,
            "allowed_values": allowed_values,
            "characteristics": characteristics,
            "locked_fields": locked_fields,
            "detected_colors": detected_colors,
            "fixed_data": fixed_data,
            "fix_prompt": fix_prompt,
        }
        
        if subject_name:
            payload["subject_name"] = subject_name
        
        result = self._call_openai(
            refiner_prompt,
            payload,
            photo_urls=None,
            max_photos=0,
        )
        
        if "characteristics" not in result:
            raise ValueError("Refiner result missing 'characteristics'")
        
        characteristics = result["characteristics"]
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
    
    def _build_charcs_meta_for_prompt(
        self,
        charcs_meta: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        result = []
        for c in charcs_meta:
            result.append({
                "id": c.get("charcID"),
                "name": c.get("name"),
                "required": c.get("required", False),
            })
        return result
    
    def _call_openai(
        self,
        system_prompt: str,
        payload: Dict[str, Any],
        photo_urls: List[str] = None,
        max_photos: int = 0,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        
        user_content = [
            {
                "type": "text",
                "text": json.dumps(payload, ensure_ascii=False)
            }
        ]
        
        if photo_urls and max_photos > 0:
            for photo_url in photo_urls[:max_photos]:
                user_content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": photo_url,
                        "detail": "low"
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
                    max_completion_tokens=2048,
                    response_format={"type": "json_object"},
                )
                
                content = response.choices[0].message.content.strip()
                break
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                if ("rate_limit" in error_str or "429" in error_str or "timeout" in error_str) and attempt < max_retries - 1:
                    wait_time = 2.0 * (2 ** attempt)
                    print(f"⚠️ API error, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                if attempt == max_retries - 1:
                    raise ValueError(f"OpenAI error after {max_retries} attempts: {str(e)}")
        
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
            raise ValueError(f"Failed to parse validator response: {e}")
    
    def _get_fallback_validator_prompt(self) -> str:
        return """
Ты — валидатор характеристик.

ПРОВЕРЯЙ:
1. ОБЯЗАТЕЛЬНЫЕ: required заполнены?
2. ALLOWED VALUES: из словарей?
3. ЦВЕТ: соответствует фото?
4. LIMITS: min/max?

SCORING:
- Критично (≤60): locked нарушены, required нет
- Серьёзно (60-80): цвет не тот, limits нарушены
- Отлично (≥90): идеально

ОТВЕТ:
{
  "score": 85,
  "issues": [],
  "fix_prompt": "..."
}
""".strip()
    
    def _get_fallback_refiner_prompt(self) -> str:
        return """
Ты — корректор характеристик.

ЗАДАЧА: Выполни fix_prompt!

ПРАВИЛА:
- locked_fields НЕ МЕНЯТЬ
- Используй detected_colors
- Соблюдай limits

ОТВЕТ:
{
  "characteristics": [...]
}
""".strip()