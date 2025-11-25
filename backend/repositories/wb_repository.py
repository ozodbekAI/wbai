from typing import List, Dict, Any
import requests

from core.config import settings


class WBRepository:
    
    BASE_URL = "https://content-api.wildberries.ru"
    
    def get_subject_charcs(self, subject_id: int) -> List[Dict[str, Any]]:
        if not settings.WB_API_KEY:
            raise ValueError("WB_API_KEY not set")
        
        url = f"{self.BASE_URL}/content/v2/object/charcs/{subject_id}"
        headers = {
            "Authorization": settings.WB_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        resp = requests.get(url, headers=headers, timeout=30)
        
        if resp.status_code != 200:
            raise ValueError(f"WB API error {resp.status_code}: {resp.text}")
        
        data = resp.json()
        
        if data.get("error"):
            raise ValueError(f"WB API error: {data.get('errorText')}")
        
        return data.get("data", [])

