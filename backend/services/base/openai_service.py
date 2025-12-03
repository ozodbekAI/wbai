import json
import time
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from openai import OpenAI, http_client
import httpx

from core.config import settings


class BaseOpenAIService(ABC):

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            http_client=http_client
        )
    def _build_user_content(
        self,
        user_payload: Dict[str, Any],
        photo_urls: Optional[List[str]] = None,
    ):
        text_part = json.dumps(user_payload, ensure_ascii=False)

        if not photo_urls:
            # Text-only kontent – oddiy string qaytaramiz
            return text_part

        content_parts: List[Dict[str, Any]] = [
            {
                "type": "text",
                "text": text_part,
            }
        ]

        for url in photo_urls:
            if not url:
                continue
            content_parts.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": url,
                        "detail": "high",
                    },
                }
            )

        return content_parts
    
    def _call_openai(
        self,
        system_prompt: str,
        user_payload: Dict[str, Any],
        photo_urls: Optional[List[str]] = None,
        max_tokens: int = 2048,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        last_error = None

        model_name = settings.OPENAI_MODEL

        for attempt in range(max_retries):
            try:
                user_content = self._build_user_content(user_payload, photo_urls)

                api_params = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "response_format": {"type": "json_object"},
                    "max_completion_tokens": max_tokens,
                }

                response = self.client.chat.completions.create(**api_params)

                if not response.choices:
                    raise ValueError("Empty response from OpenAI")

                content = response.choices[0].message.content

                if not content or not content.strip():
                    finish_reason = response.choices[0].finish_reason
                    if finish_reason == "length":
                        raise ValueError(
                            "Token limit exceeded (finish_reason='length'). "
                            "Increase max_tokens or simplify prompt."
                        )
                    raise ValueError(f"Empty content (finish_reason={finish_reason})")

                content = content.strip()

                if content.startswith("```json"):
                    content = content[7:]
                elif content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]

                content = content.strip()
                return json.loads(content)

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                print(f"❌ Attempt {attempt + 1}/{max_retries} failed: {str(e)}")

                if (
                    ("rate_limit" in error_str or "429" in error_str or
                     "timeout" in error_str or "500" in error_str)
                    and attempt < max_retries - 1
                ):
                    wait_time = 2.0 * (2 ** attempt)
                    print(f"⚠️ Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue

                if attempt == max_retries - 1:
                    break

        raise ValueError(
            f"OpenAI API failed after {max_retries} attempts: {str(last_error)}"
        )
    
    def _parse_response(self, content: str) -> Dict[str, Any]:
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        if not content:
            raise ValueError("Content is empty after stripping markdown")
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            preview = content[:500] if len(content) > 500 else content
            raise ValueError(
                f"Failed to parse JSON response: {e}\n"
                f"Content preview: {preview}\n"
                f"Content length: {len(content)} chars"
            )
    
    @abstractmethod
    def get_fallback_prompt(self) -> str:
        pass
