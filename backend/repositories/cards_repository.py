import json
from typing import List, Dict, Any, Optional

from core.config import settings


class CardsRepository:
    """Repository for cards data"""
    
    def __init__(self):
        self.cards_path = settings.DATA_DIR / "cards_raw.json"
        self.tech_path = settings.DATA_DIR / "tech_descriptions.json"
        self._cards_cache = None
    
    def _load_cards(self) -> List[Dict[str, Any]]:
        """Load cards from JSON"""
        if self._cards_cache is None:
            if not self.cards_path.exists():
                raise FileNotFoundError(f"cards_raw.json not found")
            
            with self.cards_path.open("r", encoding="utf-8") as f:
                self._cards_cache = json.load(f)
        
        return self._cards_cache
    
    def find_by_article(self, article: str) -> Dict[str, Any]:
        """Find card by article or vendorCode"""
        cards = self._load_cards()
        
        # Try as nmID
        try:
            nm_id = int(article)
            for card in cards:
                if card.get("nmID") == nm_id:
                    return card
        except ValueError:
            pass
        
        # Try as vendorCode
        article_lower = article.strip().lower()
        for card in cards:
            vendor_code = str(card.get("vendorCode", "")).strip().lower()
            if vendor_code == article_lower:
                return card
        
        raise ValueError(f"Card not found: {article}")
    
    def extract_photo_urls(self, card: Dict[str, Any]) -> List[str]:
        """Extract photo URLs from card"""
        photos = card.get("photos", [])
        urls = []
        for p in photos:
            big = p.get("big")
            if big:
                urls.append(big)
        return urls
    
    def get_tech_description(self, nm_id: Optional[int]) -> Optional[str]:
        """Get technical description by nmID"""
        if not nm_id:
            return None
        
        try:
            if not self.tech_path.exists():
                return None
            
            with self.tech_path.open("r", encoding="utf-8") as f:
                tech_data = json.load(f)
            
            return tech_data.get(str(nm_id))
        except:
            return None