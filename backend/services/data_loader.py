import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from functools import lru_cache

from core.config import settings


class SubjectConfigNotFoundError(Exception):
    def __init__(self, subject_id: int):
        self.subject_id = subject_id
        super().__init__(f"Subject config not found for ID: {subject_id}")

class DataLoader:
    
    @staticmethod
    @lru_cache(maxsize=50)
    def load_subject_config(subject_id: int) -> Dict[str, Any]:
        charcs_dir = settings.DATA_DIR / "charcs"
        config_path = charcs_dir / f"{subject_id}.json"
        
        if not config_path.exists():
            raise SubjectConfigNotFoundError(subject_id)
        
        try:
            with config_path.open("r", encoding="utf-8") as f:
                config = json.load(f)

            if not isinstance(config, dict):
                raise ValueError(f"Invalid config format for subject {subject_id}")
            
            if "characteristics" not in config:
                raise ValueError(f"Missing 'characteristics' in config for subject {subject_id}")
            
            return config
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in config for subject {subject_id}: {e}")
        
    @staticmethod
    def get_available_subject_ids() -> List[int]:
        charcs_dir = settings.DATA_DIR / "charcs"
        
        if not charcs_dir.exists():
            return []
        
        subject_ids = []
        for file_path in charcs_dir.glob("*.json"):
            try:
                subject_id = int(file_path.stem)
                subject_ids.append(subject_id)
            except ValueError:
                continue
        
        return sorted(subject_ids)
        
    @staticmethod
    def validate_subject_config(subject_id: int) -> Tuple[bool, Optional[str]]:
        try:
            DataLoader.load_subject_config(subject_id)
            return True, None
        except SubjectConfigNotFoundError:
            return False, f"Config file not found: data/charcs/{subject_id}.json"
        except ValueError as e:
            return False, str(e)
        except Exception as e:
            return False, f"Unexpected error loading config: {e}"
    
    @staticmethod
    def filter_characteristics_by_type(
        charcs_meta: List[Dict[str, Any]],
        subject_id: int,
        gender: str = None,
    ) -> Tuple[List[Dict], List[Dict], List[Dict], List[Dict]]:
        try:
            config = DataLoader.load_subject_config(subject_id)

            config_chars: Dict[Any, Dict[str, Any]] = {}
            for c in config.get("characteristics", []):
                cid = c.get("charcID")
                if cid is None:
                    continue
                config_chars[cid] = c
                try:
                    config_chars[int(cid)] = c
                except Exception:
                    pass
                try:
                    if isinstance(cid, int):
                        config_chars[str(cid)] = c
                except Exception:
                    pass

        except (SubjectConfigNotFoundError, ValueError):
            return [], [], [], charcs_meta

        fixed_fields: List[Dict[str, Any]] = []
        conditional_skip: List[Dict[str, Any]] = []
        conditional_fill: List[Dict[str, Any]] = []
        generate_fields: List[Dict[str, Any]] = []

        for meta in charcs_meta:
            char_id = meta.get("charcID")
            name = meta.get("name")

            if name == "Цвет":
                continue

            config_char = config_chars.get(char_id)

            if not config_char:
                generate_fields.append(meta)
                continue

            if config_char.get("is_fixed", False):
                fixed_fields.append(meta)
                continue

            if config_char.get("is_color", False):
                continue

            if config_char.get("is_conditional", False):
                condition = config_char.get("condition") or {}
                action = condition.get("action", "skip")

                meta_with_cond = dict(meta)
                meta_with_cond["condition"] = condition

                if action == "skip":
                    conditional_skip.append(meta_with_cond)
                    continue

                if action == "fill":
                    conditional_fill.append(meta_with_cond)

                    cond_field = condition.get("field")
                    cond_values = condition.get("values") or []

                    if cond_field == "Пол" and gender is not None and cond_values:
                        if gender not in cond_values:
                            continue

                    generate_fields.append(meta)
                    continue

                conditional_skip.append(meta_with_cond)
                continue

            generate_fields.append(meta)

        return fixed_fields, conditional_skip, conditional_fill, generate_fields
    
    @staticmethod
    def get_fixed_field_names(subject_id: int) -> List[str]:
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
    def get_limits_for_field(name: str) -> Dict[str, int]:

        limits_all = DataLoader.load_limits(color_only=False)
        limits = limits_all.get(name) or {}

        if name == "Цвет" and not limits:
            color_limits = DataLoader.load_limits(color_only=True)
            limits = color_limits.get("Цвет", {}) or {}

        return limits

    @staticmethod
    @lru_cache(maxsize=1)
    def load_generator_dict() -> Dict[str, List[str]]:
        gen_dict_path = settings.DATA_DIR / "Справочник генерация.json"
        with gen_dict_path.open("r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    @lru_cache(maxsize=1)
    def load_keywords() -> Dict[str, List[str]]:
        path = settings.DATA_DIR / "Ключевые_слова.json"
        if not path.exists():
            raise FileNotFoundError(f"Ключевые_слова.json not found: {path}")
        
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def build_allowed_values_from_keywords(
        field_names: List[str],
    ) -> Dict[str, List[str]]:

        keywords = DataLoader.load_keywords()
        result: Dict[str, List[str]] = {}
        print(field_names)

        for name in field_names:
            if name == "Цвет":
                continue
            result[name] = keywords.get(name, [])
        print(result)
        return result
    
    @staticmethod
    def build_allowed_values_for_fields(
        field_names: List[str],
        color_only: bool = False
    ) -> Dict[str, List[str]]:
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
        DataLoader.load_keywords.cache_clear()
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

    @staticmethod
    def should_fill_conditional_field(
        field_meta: Dict[str, Any],
        current_characteristics: List[Dict[str, Any]]
    ) -> bool:
        if not field_meta.get("is_conditional"):
            return True
        
        condition = field_meta.get("condition", {})
        action = condition.get("action")
        
        if action == "skip":
            return False
        
        if action == "fill":
            control_field = condition.get("field")
            expected_values = condition.get("values", [])
            
            if not control_field or not expected_values:
                return False
            
            control_value = None
            for char in current_characteristics:
                if char.get("name") == control_field:
                    val = char.get("value", [])
                    if isinstance(val, list) and val:
                        control_value = val[0] if isinstance(val[0], str) else str(val[0])
                    elif isinstance(val, str):
                        control_value = val
                    break
            
            if not control_value:
                return False
            
            control_lower = control_value.lower().strip()
            expected_lower = [str(v).lower().strip() for v in expected_values]

            if control_lower in expected_lower:
                return True
            
            for exp in expected_lower:
                if exp in control_lower or control_lower in exp:
                    return True
            
            return False
        
        return True
    

    @staticmethod
    def filter_conditional_fields_by_context(
        generate_fields: List[Dict[str, Any]],
        current_characteristics: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        filtered = []
        
        for field in generate_fields:
            if DataLoader.should_fill_conditional_field(field, current_characteristics):
                filtered.append(field)
        
        return filtered
