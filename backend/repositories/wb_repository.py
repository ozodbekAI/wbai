from typing import List, Dict, Any
import requests

from core.config import settings


class WBRepository:
    BASE_URL = "https://content-api.wildberries.ru"

    def _get_headers(self) -> Dict[str, str]:
        """
        Barcha WB API so'rovlari uchun umumiy header.
        """
        if not settings.WB_API_KEY:
            raise ValueError("WB_API_KEY not set")

        return {
            "Authorization": settings.WB_API_KEY,  # WB key bu yerga to'g'ri qo'yilgan bo'lishi kerak
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ================== SUBJECT CHARCS ==================

    def get_subject_charcs(self, subject_id: int) -> List[Dict[str, Any]]:
        """
        Мета-информация характеристик по subject_id
        """
        headers = self._get_headers()
        url = f"{self.BASE_URL}/content/v2/object/charcs/{subject_id}"

        resp = requests.get(url, headers=headers, timeout=30)

        if resp.status_code != 200:
            raise ValueError(f"WB API error {resp.status_code}: {resp.text}")

        data = resp.json()

        if data.get("error"):
            raise ValueError(f"WB API error: {data.get('errorText')}")

        raw_charcs = data.get("data", [])

        filtered = [
            {
                "charcID": item["charcID"],
                "name": item["name"],
                "required": item["required"],
            }
            for item in raw_charcs
        ]

        return filtered

    # ================== KARTALAR BILAN ISH ==================

    def get_cards_by_article(
        self,
        article: str,
        *,
        with_photo: int = -1,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        WB content/v2/get/cards/list endpointiga textSearch=article bilan POST yuboradi
        va "cards" massivini qaytaradi.
        textSearch doim STRING bo'lishi kerak.
        """
        headers = self._get_headers()
        url = f"{self.BASE_URL}/content/v2/get/cards/list"

        body = {
            "settings": {
                "cursor": {
                    "limit": limit,
                },
                "filter": {
                    "textSearch": str(article),
                    "withPhoto": with_photo,
                },
                "sort": {
                    "ascending": False
                },
            }
        }

        resp = requests.post(url, headers=headers, json=body, timeout=30)

        if resp.status_code != 200:
            raise ValueError(f"WB API error {resp.status_code}: {resp.text}")

        data = resp.json()

        if isinstance(data, dict) and data.get("error"):
            raise ValueError(f"WB API error: {data.get('errorText')}")

        cards = data.get("cards", [])
        return cards

    def get_card_by_article(self, article: str) -> Dict[str, Any]:
        """
        article (vendorCode, nmID yoki shunga o'xshash qidiruv satri) bo'yicha
        WB'dan bitta eng mos kartani qaytaradi.
        """
        cards = self.get_cards_by_article(article)

        if not cards:
            raise ValueError(
                f"Card with article/textSearch '{article}' not found in WB API"
            )

        article_lower = str(article).strip().lower()

        # 1) vendorCode bo'yicha aniq match
        for card in cards:
            vendor_code = str(card.get("vendorCode", "")).strip().lower()
            if vendor_code == article_lower:
                return card

        nm_id = None
        try:
            nm_id = int(article)
        except ValueError:
            pass

        if nm_id is not None:
            for card in cards:
                if card.get("nmID") == nm_id:
                    return card

        return cards[0]

    def update_cards(self, cards: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        POST /content/v2/cards/update

        cards – WB dokumentatsiyadagi array:
        [
          {
            "nmID": ...,
            "vendorCode": "...",
            "brand": "...",
            "title": "...",
            "description": "...",
            "dimensions": {...},
            "characteristics": [...],
            "sizes": [...]
          },
          ...
        ]
        """
        url = f"{self.BASE_URL}/content/v2/cards/update"
        headers = self._get_headers()
        r = requests.post(url, headers=headers, json=cards, timeout=30)

        if r.status_code != 200:
            raise ValueError(f"WB update error {r.status_code}: {r.text}")

        data = r.json()
        if isinstance(data, dict) and data.get("error"):
            raise ValueError(f"WB update failed: {data.get('errorText')}")
        return data

    # ================== MEDIA (FOTO/VIDEO) ==================

    def upload_media_file(
        self,
        nm_id: int,
        photo_number: int,
        file_bytes: bytes,
        filename: str,
        content_type: str = "image/jpeg",
    ) -> Dict[str, Any]:
        """
        POST /content/v3/media/file
        Faylni WB media API ga yuklaydi.
        """
        url = f"{self.BASE_URL}/content/v3/media/file"
        headers = self._get_headers()
        headers["X-Nm-Id"] = str(nm_id)
        headers["X-Photo-Number"] = str(photo_number)

        files = {"uploadfile": (filename, file_bytes, content_type)}
        r = requests.post(url, headers=headers, files=files, timeout=60)

        if r.status_code != 200:
            raise ValueError(f"WB upload failed {r.status_code}: {r.text}")

        data = r.json()
        if isinstance(data, dict) and data.get("error"):
            raise ValueError(f"WB upload error: {data.get('errorText')}")
        return data

    def save_media_state(self, nm_id: int, urls: List[str]) -> Dict[str, Any]:
        """
        POST /content/v3/media/save
        urls: ["https://.../1.jpg", "https://.../2.jpg", ...]
        """
        url = f"{self.BASE_URL}/content/v3/media/save"
        headers = self._get_headers()
        payload = {"nmID": nm_id, "data": urls}

        r = requests.post(url, headers=headers, json=payload, timeout=30)

        if r.status_code != 200:
            raise ValueError(f"WB media/save error {r.status_code}: {r.text}")

        data = r.json()
        if isinstance(data, dict) and data.get("error"):
            raise ValueError(f"WB media/save failed: {data.get('errorText')}")
        return data