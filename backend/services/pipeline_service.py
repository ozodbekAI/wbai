import time
from typing import Dict, Any, Callable, Optional

from services.gpt_service import GPTService
from services.color_service import ColorService
from services.validator_service import ValidatorService
from services.description_service import DescriptionService
from repositories.cards_repository import CardsRepository
from repositories.fixed_repository import FixedRepository
from repositories.wb_repository import WBRepository
from core.config import settings


class PipelineService:
    
    def __init__(self):
        self.gpt_service = GPTService()
        self.color_service = ColorService()
        self.validator_service = ValidatorService()
        self.description_service = DescriptionService()
        self.cards_repo = CardsRepository()
        self.fixed_repo = FixedRepository()
        self.wb_repo = WBRepository()
    
    def process_article(
        self,
        article: str,
        log_callback: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        
        def log(msg: str):
            if log_callback:
                log_callback(msg)
        
        log(f"📦 Loading card: {article}")
        card = self.cards_repo.find_by_article(article)
        old_characteristics = card.get("characteristics", [])
        subject_name = card.get("subjectName") or card.get("subject", {}).get("name")
        
        # Получаем старые данные
        old_title = card.get("title", "")
        nm_id = card.get("nmID")
        old_description = self.cards_repo.get_tech_description(nm_id) or ""
        
        log("📋 Loading fixed data...")
        fixed_row = self.fixed_repo.get_by_artikul(article)
        fixed_data = self._build_fixed_data_dict(fixed_row)
        
        if fixed_row:
            log(f"✅ Found {len(fixed_data)} fixed fields")
        
        log("📸 Extracting photos...")
        photo_urls = self.cards_repo.extract_photo_urls(card)
        log(f"✅ Found {len(photo_urls)} photos")

        subject_id = card["subjectID"]
        log(f"🔍 Loading characteristics (subjectID: {subject_id})...")
        charcs_meta_raw = self.wb_repo.get_subject_charcs(subject_id)
        log(f"✅ Loaded {len(charcs_meta_raw)} characteristics")

        log("📚 Loading dictionaries...")
        limits = self.gpt_service.load_limits()
        allowed_values = self.gpt_service.build_allowed_values(charcs_meta_raw)
        
        log("🎨 Detecting colors...")
        detected_colors = self.color_service.detect_colors(
            photo_urls=photo_urls,
            allowed_values=allowed_values,
            log_callback=log
        )
        
        log("🤖 Generating characteristics (iteration 1)...")
        time.sleep(1)
        
        locked_fields = list(fixed_data.keys()) if fixed_data else []
        
        ai_charcs = self.gpt_service.generate_characteristics(
            photo_urls=photo_urls,
            charcs_meta_raw=charcs_meta_raw,
            limits=limits,
            allowed_values=allowed_values,
            detected_colors=detected_colors,
            fixed_data=fixed_data,
            subject_name=subject_name,
        )
        
        merged_charcs = self._override_with_fixed(
            ai_charcs, charcs_meta_raw, fixed_row
        )

        best_result = self.validator_service.validate_with_iterations(
            photo_urls=photo_urls,
            charcs_meta_raw=charcs_meta_raw,
            limits=limits,
            allowed_values=allowed_values,
            initial_charcs=merged_charcs,
            locked_fields=locked_fields,
            detected_colors=detected_colors,
            fixed_data=fixed_data,
            fixed_row=fixed_row,
            subject_name=subject_name,
            log_callback=log,
        )
        
        final_charcs = best_result["characteristics"]
        final_score = best_result["score"]
        final_issues = best_result["issues"]
        final_fix_prompt = best_result["fix_prompt"]
        iterations_done = best_result["iterations_done"]
        best_iteration = best_result["best_iteration"]
        
        log("\n📝 Generating description...")
        
        wb_description_result = self.description_service.generate_description(
            tech_description=old_description,
            characteristics=final_charcs,
            title=None,
            old_description=old_description  # Передаем старое описание
        )
        
        log("\n🏷️ Generating title...")
        wb_title_result = self.description_service.generate_title(
            subject_name=subject_name,
            characteristics=final_charcs,
            description=wb_description_result["new_description"],
            tech_description=old_description,
            old_title=old_title  # Передаем старый title
        )
        
        return {
            "nmID": card.get("nmID"),
            "subjectID": subject_id,
            "photo_urls": photo_urls,
            
            # СТАРЫЕ ДАННЫЕ
            "old_title": old_title,
            "old_description": old_description,
            "old_characteristics": old_characteristics,
            
            # НОВЫЕ ДАННЫЕ
            "new_title": wb_title_result["new_title"],
            "new_description": wb_description_result["new_description"],
            "new_characteristics": final_charcs,
            
            # ИСТОРИЯ И ДЕТАЛИ
            "title_history": wb_title_result.get("history", []),
            "description_history": wb_description_result.get("history", []),
            
            "fixed_row": fixed_row,
            "detected_colors": detected_colors,
            "validation_score": final_score,
            "validation_issues": final_issues,
            "validation_fix_prompt": final_fix_prompt,
            "iterations_done": iterations_done,
            "best_iteration": best_iteration,
            
            "title_warnings": wb_title_result["warnings"],
            "title_score": wb_title_result["score"],
            "title_attempts": wb_title_result["attempts"],
            
            "description_warnings": wb_description_result["warnings"],
            "description_score": wb_description_result["score"],
            "description_attempts": wb_description_result["attempts"],
        }
    
    def _build_fixed_data_dict(self, fixed_row: Dict[str, Any]) -> Dict[str, list]:
        if not fixed_row:
            return {}
        
        fixed_row_clean = fixed_row.copy()
        if fixed_row_clean:
            first_key = list(fixed_row_clean.keys())[0]
            fixed_row_clean.pop(first_key, None)
        
        result = {}
        for name, raw_value in fixed_row_clean.items():
            if not raw_value:
                continue
            parts = [
                p.strip()
                for p in str(raw_value).replace(";", ",").split(",")
                if p.strip()
            ]
            if parts:
                result[name] = parts
        
        return result
    
    def _override_with_fixed(
        self,
        ai_charcs: list,
        charcs_meta_raw: list,
        fixed_row: Dict[str, Any],
    ) -> list:
        if not fixed_row:
            return ai_charcs
        
        fixed_row_clean = fixed_row.copy()
        if fixed_row_clean:
            first_key = list(fixed_row_clean.keys())[0]
            fixed_row_clean.pop(first_key, None)
        
        name_to_meta = {c.get("name"): c for c in charcs_meta_raw if c.get("name")}
        name_to_idx = {}
        for idx, ch in enumerate(ai_charcs):
            name = ch.get("name")
            if name:
                name_to_idx[name] = idx
        
        result = ai_charcs.copy()
        
        for name, raw_value in fixed_row_clean.items():
            if not raw_value:
                continue
            meta = name_to_meta.get(name)
            if not meta:
                continue
            
            parts = [
                p.strip()
                for p in str(raw_value).replace(";", ",").split(",")
                if p.strip()
            ]
            if not parts:
                continue
            
            if name in name_to_idx:
                idx = name_to_idx[name]
                result[idx]["value"] = parts
            else:
                result.append({
                    "id": meta.get("charcID"),
                    "name": name,
                    "value": parts,
                })
        
        return result