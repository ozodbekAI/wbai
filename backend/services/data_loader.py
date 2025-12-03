import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
from functools import lru_cache

from core.config import settings


class DataLoader:
    
    @staticmethod
    @lru_cache(maxsize=50)
    def load_subject_config(subject_id: int) -> Dict[str, Any]:
        """
        Load subject-specific configuration from JSON file.
        Example: subject_id=177 -> loads data/charcs/177.json
        """
        charcs_dir = settings.DATA_DIR / "charcs"
        config_path = charcs_dir / f"{subject_id}.json"
        
        if not config_path.exists():
            raise FileNotFoundError(f"Subject config not found: {config_path}")
        
        with config_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    
    @staticmethod
    def filter_characteristics_by_type(
        charcs_meta: List[Dict[str, Any]],
        subject_id: int,
        gender: str = None
    ) -> Tuple[List[Dict], List[Dict], List[Dict], List[Dict]]:
        """
        Filter characteristics into 4 groups:
        1. fixed_fields - only from Excel/config, never generate
        2. conditional_skip - skip based on conditions (NEVER generate)
        3. conditional_fill - fill only if condition met
        4. generate_fields - normal AI generation
        """
        try:
            config = DataLoader.load_subject_config(subject_id)

            # charcID lar uchun int/str har ikkisini support qilamiz
            config_chars: Dict[Any, Dict[str, Any]] = {}
            for c in config.get("characteristics", []):
                cid = c.get("charcID")
                if cid is None:
                    continue
                config_chars[cid] = c
                # int/str cross-key
                try:
                    config_chars[int(cid)] = c
                except Exception:
                    pass
                try:
                    if isinstance(cid, int):
                        config_chars[str(cid)] = c
                except Exception:
                    pass

        except FileNotFoundError:
            # If config not found, treat all as generate_fields
            return [], [], [], charcs_meta
        
        fixed_fields = []
        conditional_skip = []
        conditional_fill = []
        generate_fields = []
        
        for meta in charcs_meta:
            char_id = meta.get("charcID")
            name = meta.get("name")
            
            # Skip color - handled separately
            if name == "Цвет":
                continue
            
            config_char = config_chars.get(char_id)
            
            if not config_char:
                # Not in config = generate normally
                generate_fields.append(meta)
                continue

            if config_char.get("is_fixed", False):
                fixed_fields.append(meta)
                continue
            
            if config_char.get("is_color", False):
                continue

            if config_char.get("is_conditional", False):
                condition = config_char.get("condition", {})
                action = condition.get("action", "skip")
                
                if action == "skip":
                    conditional_skip.append(meta)
                    continue
                elif action == "fill":
                    cond_field = condition.get("field")
                    cond_values = condition.get("values", [])
                    
                    if cond_field == "Пол" and gender in cond_values:
                        generate_fields.append(meta)
                    else:
                        conditional_skip.append(meta)
                    continue
                else:

                    conditional_skip.append(meta)
                    continue
            
            generate_fields.append(meta)
        
        return fixed_fields, conditional_skip, conditional_fill, generate_fields
    
    @staticmethod
    def get_fixed_field_names(subject_id: int) -> List[str]:
        """Get list of field names that are marked as is_fixed"""
        try:
            config = DataLoader.load_subject_config(subject_id)
            return [
                c["name"] 
                for c in config.get("characteristics", [])
                if c.get("is_fixed", False)
            ]
        except FileNotFoundError:
            return []
    
    @staticmethod
    @lru_cache(maxsize=2)
    def load_limits(color_only: bool = False) -> Dict[str, Dict[str, int]]:
        limits_path = settings.DATA_DIR / "Справочник лимитов.json"
        with limits_path.open("r", encoding="utf-8") as f:
            all_limits = json.load(f)
        
        if color_only:
            return {"Цвет": all_limits.get("Цвет", {})}
        else:
            return {k: v for k, v in all_limits.items() if k != "Цвет"}
    
    @staticmethod
    @lru_cache(maxsize=1)
    def load_generator_dict() -> Dict[str, List[str]]:
        gen_dict_path = settings.DATA_DIR / "Справочник генерация.json"
        with gen_dict_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    
    @staticmethod
    def build_allowed_values_for_fields(
        field_names: List[str],
        color_only: bool = False
    ) -> Dict[str, List[str]]:
        """
        Build allowed_values dict for specific field names.
        Returns only fields that exist in generator dict.
        """
        generator_dict = DataLoader.load_generator_dict()
        
        if color_only:
            return {
                "Цвет": generator_dict.get("Цвет", [])
            }
        
        result = {}
        for name in field_names:
            if name == "Цвет":
                continue
            if name in generator_dict:
                result[name] = generator_dict[name]
        
        return result
    
    @staticmethod
    def split_fields_by_dictionary_availability(
        field_names: List[str]
    ) -> tuple[List[str], List[str]]:
        """
        Split fields into two groups:
        - with_dict: fields that have allowed_values in generator dict
        - without_dict: text fields without dictionary (free-form)
        
        Returns: (fields_with_dict, fields_without_dict)
        """
        generator_dict = DataLoader.load_generator_dict()
        
        with_dict = []
        without_dict = []
        
        for name in field_names:
            if name == "Цвет":
                continue
            if name in generator_dict:
                with_dict.append(name)
            else:
                without_dict.append(name)
        
        return with_dict, without_dict
    
    @staticmethod
    def split_color_and_others(
        allowed_values: Dict[str, List[str]]
    ) -> tuple[Dict[str, List[str]], Dict[str, List[str]]]:
        color_values = {}
        other_values = {}
        
        for key, values in allowed_values.items():
            if key == "Цвет":
                color_values[key] = values
            else:
                other_values[key] = values
        
        return color_values, other_values
    
    @staticmethod
    def clear_cache():
        DataLoader.load_limits.cache_clear()
        DataLoader.load_generator_dict.cache_clear()
        DataLoader.load_subject_config.cache_clear()
        print("✅ Data loader cache cleared")

    @staticmethod
    def load_parent_names() -> List[str]:
        path = settings.DATA_DIR / "color_names.json"
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        parent_names = {item["parentName"] for item in data.get('data', []) if item.get("parentName")}
        return sorted(parent_names)
        
    @staticmethod
    def load_by_parent(parent_name: str) -> List[str]:
        path = settings.DATA_DIR / "color_names.json"
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        return [
            item["name"]
            for item in data.get('data', [])
            if item.get("parentName") == parent_name
        ]