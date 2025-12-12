from logging import log 
import time
from typing import Dict, Any, Callable, List, Optional

from services.validators.global_validator import validation_card
from services.image_analyzer_service import ImageAnalyzerService
from services.color_service import ColorService
from services.generators import CharacteristicsGeneratorService
from services.validators.color_validator import ColorValidatorService
from services.validators.characteristics_validator import CharacteristicsValidatorService
from services.description_service import DescriptionService
from repositories.cards_repository import CardsRepository
from repositories.fixed_repository import FixedRepository
from repositories.wb_repository import WBRepository
from services.data_loader import DataLoader


class PipelineService:
    def __init__(self):
        self.image_analyzer = ImageAnalyzerService()
        self.color_service = ColorService()
        self.color_validator = ColorValidatorService()

        self.characteristics_generator = CharacteristicsGeneratorService()
        self.characteristics_validator = CharacteristicsValidatorService()

        self.description_service = DescriptionService()

        self.cards_repo = CardsRepository()
        self.fixed_repo = FixedRepository()
        self.wb_repo = WBRepository()

        self.data_loader = DataLoader()

    def _load_card_from_api(self, article: str) -> Dict[str, Any]:

        card = self.wb_repo.get_card_by_article(article)
        if not card:
            raise ValueError(f"Card with article {article} not found in WB API")
        return card

    def get_current_card(self, article: str) -> Dict[str, Any] | None:
        try:
            card = self._load_card_from_api(article)
        except ValueError:
            return {
                "status": "error",
                "message": f"Card with article {article} not found",
            }

        subject_id = card["subjectID"]
        charcs_meta_raw = self.wb_repo.get_subject_charcs(subject_id)

        all_allowed_values = DataLoader.load_generator_dict()
        color_limits = DataLoader.load_limits(color_only=True)
        other_limits = DataLoader.load_limits(color_only=False)

        gender = self._extract_gender_from_card(card)
        
        fixed_fields, conditional_skip, conditional_fill, generate_fields = \
                self.data_loader.filter_characteristics_by_type(charcs_meta_raw, subject_id, gender)

        validation_messages = validation_card(
            card,
            charcs_meta_raw,
            all_allowed_values,
            color_limits,
            other_limits,
            conditional_skip
        )
        return {
            "status": "ok",
            "card": card,
            "response": validation_messages,
        }

    def process_article(
        self,
        article: str,
        log_callback: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        
        def log(msg: str):
            print(msg)
            if log_callback:
                log_callback(msg)

        try:
            log("📥 Loading card data (via WB API)...")
            card = self._load_card_from_api(article)

            subject_id = card["subjectID"]
            subject_name = card.get("subjectName") or card.get("subject", {}).get("name")
            
            log(f"📋 Subject ID: {subject_id}, Name: {subject_name}")

            from services.data_loader import DataLoader
            
            is_valid, error_msg = DataLoader.validate_subject_config(subject_id)
            
            if not is_valid:
                available_ids = DataLoader.get_available_subject_ids()
                
                error_response = {
                    "status": "error",
                    "error_type": "subject_config_not_found",
                    "article": article,
                    "subject_id": subject_id,
                    "subject_name": subject_name,
                    "message": error_msg,
                    "available_subject_ids": available_ids[:20],
                    "total_available": len(available_ids),
                    "suggestion": f"Create file: data/charcs/{subject_id}.json"
                }
                
                log(f"❌ ERROR: {error_msg}")
                log(f"💡 Available subject IDs (showing first 10): {available_ids[:10]}")
                
                return error_response
            

            fixed_row = self.fixed_repo.get_by_artikul(article)
            fixed_data = self._build_fixed_data_dict(fixed_row)
            
            photo_urls = self.cards_repo.extract_photo_urls(card)
            charcs_meta_raw = self.wb_repo.get_subject_charcs(subject_id)

            gender = self._extract_gender_from_card(card)
            

            fixed_fields, conditional_skip, conditional_fill, generate_fields = \
                self.data_loader.filter_characteristics_by_type(charcs_meta_raw, subject_id, gender)

            fixed_field_names = {f.get("name") for f in fixed_fields if f.get("name")}
            skip_field_names = {f.get("name") for f in conditional_skip if f.get("name")}
            excel_fixed_names = set(fixed_data.keys())

            locked_field_names = fixed_field_names | skip_field_names | excel_fixed_names

            generate_fields_for_ai = [
                meta for meta in generate_fields
                if meta.get("name") and meta.get("name") not in locked_field_names
            ]


            generate_field_names = [f["name"] for f in generate_fields_for_ai if f.get("name")]

            allowed_values = DataLoader.build_allowed_values_from_keywords(generate_field_names)
            other_limits = DataLoader.load_limits(color_only=False)
            filtered_limits = {name: other_limits.get(name, {}) for name in generate_field_names}

            fields_with_dict = {name for name, vals in allowed_values.items() if vals}
            fields_without_dict = set(generate_field_names) - fields_with_dict
            
            if fields_without_dict:
                log(f"ℹ️  Text fields (no dictionary): {len(fields_without_dict)}")
            log("\n🖼️  STEP 1: Analyzing images...")
            
            image_description = self.image_analyzer.analyze_images(
                photo_urls=photo_urls[:2],
                subject_name=subject_name,
                log_callback=log,
                target_char_names=generate_field_names,
            )

            log(f"✅ Image analysis: {len(image_description)} chars")

            log("\n🎨 STEP 2: Color detection + validation...")
            
            color_result = self.color_service.detect_colors_from_text(
                image_description=image_description,
                log_callback=log
            )
            
            if isinstance(color_result, tuple):
                detected_colors, allowed_colors = color_result
            else:
                detected_colors = color_result
                allowed_colors = []
            
            if isinstance(detected_colors, dict):
                detected_colors = detected_colors.get("colors", [])
            elif not isinstance(detected_colors, list):
                detected_colors = []

            normalized_colors = []
            for c in detected_colors:
                cs = str(c).strip()
                if cs and cs not in normalized_colors:
                    normalized_colors.append(cs)
            detected_colors = normalized_colors[:5]
            
            log(f"✅ Colors detected: {detected_colors}")

            log("\n⚙️  STEP 3: Generating characteristics...")
            
            primary_field_names = {"Тип низа", "Тип верха", "Пол", "Сезон"}
            
            primary_fields = [
                f for f in generate_fields_for_ai 
                if f.get("name") in primary_field_names
            ]
            
            secondary_fields = [
                f for f in generate_fields_for_ai 
                if f.get("name") not in primary_field_names
            ]
            
            log(f"   📍 Primary fields (dependencies): {len(primary_fields)}")
            log(f"   📍 Secondary fields: {len(secondary_fields)}")

            if primary_fields:
                log("   🔄 Generating PRIMARY fields...")
                
                primary_names = [f["name"] for f in primary_fields if f.get("name")]
                primary_allowed = {
                    name: allowed_values.get(name, []) 
                    for name in primary_names
                }
                primary_limits = {
                    name: filtered_limits.get(name, {}) 
                    for name in primary_names
                }
                
                primary_result = self._generate_and_validate_characteristics_batched(
                    image_description=image_description,
                    charcs_meta_raw=primary_fields,
                    limits=primary_limits,
                    allowed_values=primary_allowed,
                    detected_colors=detected_colors,
                    fixed_data=fixed_data,
                    subject_name=subject_name,
                    log_callback=log,
                    all_field_names=generate_field_names,
                    conditional_skip=conditional_skip,
                    locked_fields=list(locked_field_names),
                )
                
                primary_charcs = primary_result["characteristics"]
                log(f"   ✅ PRIMARY fields generated: {len(primary_charcs)}")
            else:
                primary_charcs = []
            
            # Filter SECONDARY fields based on conditional logic
            log("   🔍 Filtering SECONDARY fields based on conditions...")
            
            filtered_secondary = DataLoader.filter_conditional_fields_by_context(
                secondary_fields,
                primary_charcs
            )
            
            removed_count = len(secondary_fields) - len(filtered_secondary)
            if removed_count > 0:
                removed_names = [
                    f.get("name") 
                    for f in secondary_fields 
                    if f not in filtered_secondary
                ]
                log(f"   ℹ️  Removed {removed_count} conditional fields: {removed_names}")
            
            # Generate SECONDARY fields
            if filtered_secondary:
                log(f"   🔄 Generating SECONDARY fields ({len(filtered_secondary)})...")
                
                secondary_names = [f["name"] for f in filtered_secondary if f.get("name")]
                secondary_allowed = {
                    name: allowed_values.get(name, []) 
                    for name in secondary_names
                }
                secondary_limits = {
                    name: filtered_limits.get(name, {}) 
                    for name in secondary_names
                }
                
                secondary_result = self._generate_and_validate_characteristics_batched(
                    image_description=image_description,
                    charcs_meta_raw=filtered_secondary,
                    limits=secondary_limits,
                    allowed_values=secondary_allowed,
                    detected_colors=detected_colors,
                    fixed_data=fixed_data,
                    subject_name=subject_name,
                    log_callback=log,
                    all_field_names=generate_field_names,
                    conditional_skip=conditional_skip,
                    locked_fields=list(locked_field_names),
                )
                
                secondary_charcs = secondary_result["characteristics"]
                log(f"   ✅ SECONDARY fields generated: {len(secondary_charcs)}")
            else:
                secondary_charcs = []
                secondary_result = {
                    "score": 100,
                    "iterations": 0,
                    "issues": []
                }
            
            # Combine results
            ai_charcs_all = primary_charcs + secondary_charcs
            
            # Average scores
            if primary_fields and filtered_secondary:
                chars_score = int(
                    (primary_result["score"] + secondary_result["score"]) / 2
                )
                chars_iterations = primary_result["iterations"] + secondary_result["iterations"]
                chars_issues = primary_result["issues"] + secondary_result["issues"]
            elif primary_fields:
                chars_score = primary_result["score"]
                chars_iterations = primary_result["iterations"]
                chars_issues = primary_result["issues"]
            elif filtered_secondary:
                chars_score = secondary_result["score"]
                chars_iterations = secondary_result["iterations"]
                chars_issues = secondary_result["issues"]
            else:
                chars_score = 0
                chars_iterations = 0
                chars_issues = []

            log(f"✅ Characteristics validated (score: {chars_score})")

            # ========================================
            # Merge all characteristics
            # ========================================
            merged_charcs = self._build_full_characteristics(
                charcs_meta_raw=charcs_meta_raw,
                fixed_row=fixed_row,
                ai_charcs=ai_charcs_all,
                detected_colors=detected_colors,
                fixed_fields=fixed_fields,
                conditional_skip=conditional_skip,
                conditional_fill=conditional_fill,
            )

            # ========================================
            # Statistics
            # ========================================
            ai_filled = sum(1 for c in ai_charcs_all if c.get("value"))
            fixed_filled = sum(
                1
                for c in merged_charcs
                if c.get("name") in [f.get("name") for f in fixed_fields] and c.get("value")
            )
            total_filled = sum(1 for c in merged_charcs if c.get("value"))

            total_fields = len(charcs_meta_raw)
            required_fields = sum(1 for m in charcs_meta_raw if m.get("required"))
            optional_fields = total_fields - required_fields

            name_to_required = {
                m.get("name"): bool(m.get("required"))
                for m in charcs_meta_raw
                if m.get("name")
            }

            required_filled = 0
            for ch in merged_charcs:
                name = ch.get("name")
                if not name or not name_to_required.get(name):
                    continue
                val = ch.get("value")
                if isinstance(val, list):
                    is_filled = any(str(v).strip() for v in val)
                else:
                    is_filled = bool(str(val or "").strip())
                if is_filled:
                    required_filled += 1

            required_missing = required_fields - required_filled
            ai_target_fields = len(generate_fields_for_ai)
            final_charcs = merged_charcs

            # ========================================
            # STEP 4: Description Generation
            # ========================================
            log("\n📝 STEP 4: Description generation + validation...")
            
            wb_description_result = self.description_service.generate_description(
                image_description=image_description,
                max_iterations=3
            )
            
            log(f"✅ Description: {len(wb_description_result['new_description'])} chars (score: {wb_description_result['score']})")
            time.sleep(1)
            
            # ========================================
            # STEP 5: Title Generation
            # ========================================
            log("\n🏷️  STEP 5: Title generation + validation...")
            
            wb_title_result = self.description_service.generate_title(
                subject_name=subject_name,
                characteristics=final_charcs,
                description=wb_description_result["new_description"],
                max_iterations=3
            )
            
            log(f"✅ Title: {wb_title_result['new_title']} (score: {wb_title_result['score']})")

            # ========================================
            # Final Response
            # ========================================
            return {
                "status": "success",
                "nmID": card.get("nmID"),
                "article": article,
                "subjectID": subject_id,
                "subjectName": subject_name,

                "old_title": card.get("title"),
                "old_description": card.get("description"),
                "old_characteristics": card.get("characteristics") or [],

                "photo_urls": photo_urls,
                "image_description": image_description,

                "new_title": wb_title_result["new_title"],
                "new_description": wb_description_result["new_description"],
                "new_characteristics": final_charcs,

                "detected_colors": detected_colors,

                "validation_score": chars_score,
                "validation_issues": chars_issues,
                "iterations_done": chars_iterations,

                "title_history": wb_title_result.get("history", []),
                "title_warnings": wb_title_result["warnings"],
                "title_score": wb_title_result["score"],
                "title_attempts": wb_title_result["attempts"],

                "description_history": wb_description_result.get("history", []),
                "description_warnings": wb_description_result["warnings"],
                "description_score": wb_description_result["score"],
                "description_attempts": wb_description_result["attempts"],

                "fixed_row": fixed_row,

                "stats": {
                    "fixed_fields": len(fixed_fields),
                    "conditional_skip": len(conditional_skip),
                    "conditional_fill": len(conditional_fill),
                    "generated_fields": len(generate_fields_for_ai),
                    "primary_fields_generated": len(primary_fields),
                    "secondary_fields_generated": len(filtered_secondary),
                    "conditional_fields_removed": removed_count if filtered_secondary else 0,
                    "total_fields": total_fields,
                    "required_fields": required_fields,
                    "optional_fields": optional_fields,
                    "required_filled": required_filled,
                    "required_missing": required_missing,
                    "ai_target_fields": ai_target_fields,
                    "ai_filled": ai_filled,
                    "fixed_filled": fixed_filled,
                    "total_filled": total_filled,
                }
            }
        
        except ValueError as e:
            # Card not found
            log(f"❌ Card not found: {e}")
            return {
                "status": "error",
                "error_type": "card_not_found",
                "article": article,
                "message": f"Card with article {article} not found in WB API"
            }
        
        except Exception as e:
            # Unexpected error
            log(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "status": "error",
                "error_type": "unexpected",
                "article": article,
                "message": str(e),
                "traceback": traceback.format_exc()
            }

    def _extract_gender_from_card(self, card: Dict[str, Any]) -> Optional[str]:
        characteristics = card.get("characteristics", [])
        for char in characteristics:
            if char.get("name") == "Пол":
                value = char.get("value")
                if isinstance(value, list) and value:
                    return value[0]
                elif isinstance(value, str):
                    return value
        return None

    def _add_color_to_characteristics(
        self,
        characteristics: list,
        colors: list,
        charcs_meta_raw: list,
    ) -> list:
        if not colors:
            return characteristics

        color_meta = None
        for meta in charcs_meta_raw:
            if meta.get("name") == "Цвет":
                color_meta = meta
                break

        if not color_meta:
            return characteristics

        has_color = any(ch.get("name") == "Цвет" for ch in characteristics)
        if not has_color:
            characteristics.insert(
                0,
                {
                    "id": color_meta.get("charcID"),
                    "name": "Цвет",
                    "value": colors,
                },
            )

        return characteristics

    def _build_fixed_data_dict(self, fixed_row: Dict[str, Any]) -> Dict[str, List[str]]:
        if not fixed_row:
            return {}

        fixed_row_clean = fixed_row.copy()
        if fixed_row_clean:
            first_key = list(fixed_row_clean.keys())[0]
            fixed_row_clean.pop(first_key, None)

        result: Dict[str, List[str]] = {}
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

    def _generate_and_validate_characteristics_batched(
        self,
        image_description: str,
        charcs_meta_raw: list,
        limits: Dict[str, Dict[str, int]],
        allowed_values: Dict[str, List[str]],
        detected_colors: List[str],
        fixed_data: Dict[str, List[str]],
        subject_name: Optional[str],
        log_callback: Optional[Callable[[str], None]] = None,
        batch_size: int = 10,
        all_field_names: List[str] = None,
        conditional_skip: List[Dict[str, Any]] = None,
        locked_fields: List[str] = None,
    ) -> Dict[str, Any]:

        def log(msg: str):
            if log_callback:
                log_callback(msg)

        locked_fields = locked_fields or []

        skip_names = set()
        if conditional_skip:
            skip_names = {f.get("name") for f in conditional_skip if f.get("name")}

        total_fields = len(charcs_meta_raw)
        log(f"  🔧 AI fields to generate (batched): {total_fields}")

        all_charcs: List[Dict[str, Any]] = []
        batch_scores: List[int] = []
        all_issues: List[Any] = []
        total_iterations = 0

        def is_empty_value(char: Dict[str, Any]) -> bool:
            v = char.get("value")
            if v is None:
                return True
            if isinstance(v, str):
                return not v.strip()
            if isinstance(v, list):
                return not [str(x).strip() for x in v if str(x).strip()]
            return not str(v).strip()

        for start in range(0, total_fields, batch_size):
            end = min(start + batch_size, total_fields)
            batch_meta = charcs_meta_raw[start:end]
            batch_names = [m.get("name") for m in batch_meta if m.get("name")]

            log(
                f"  ▶️ Batch {start // batch_size + 1}: fields {start+1}-{end} ({len(batch_meta)} items)"
            )

            batch_limits: Dict[str, Dict[str, int]] = {
                name: limits.get(name, {}) for name in batch_names
            }
            batch_allowed: Dict[str, List[str]] = {
                name: allowed_values.get(name, []) for name in batch_names
            }

            strict_instructions = {}
            for name in batch_names:
                vals = batch_allowed.get(name, [])
                lims = batch_limits.get(name, {})
                max_count = (
                    lims.get("max") or lims.get("maxCount") or lims.get("max_count") or 99
                )

                if vals:
                    strict_instructions[name] = {
                        "allowed_count": len(vals),
                        "max_count": max_count,
                        "sample_values": vals[:10],  # Birinchi 10 ta misol
                        "rule": f"FAQAT {len(vals)} ta qiymatdan tanlash. Max {max_count} ta.",
                    }
                else:
                    strict_instructions[name] = {
                        "type": "free_text",
                        "max_count": max_count,
                        "rule": f"Free text. Max {max_count} ta element.",
                    }

            def process_batch(
                batch_meta_local: list, batch_names_local: List[str]
            ) -> Dict[str, Any]:
                # GENERATSIYA
                ai_charcs_batch = self.characteristics_generator.generate_characteristics(
                    image_description=image_description,
                    charcs_meta_raw=batch_meta_local,
                    limits=batch_limits,
                    allowed_values=batch_allowed,
                    detected_colors=detected_colors,
                    fixed_data=fixed_data,
                    subject_name=subject_name,
                    log_callback=log,
                    all_field_names=all_field_names,  # CONTEXT
                )

                # VALIDATSIYA
                validation = self.characteristics_validator.validate_characteristics(
                    characteristics=ai_charcs_batch,
                    charcs_meta_raw=batch_meta_local,
                    limits=batch_limits,
                    allowed_values=batch_allowed,
                    locked_fields=locked_fields,
                    log_callback=log,
                )
                return validation

            validation_result = process_batch(batch_meta, batch_names)
            batch_charcs = validation_result["characteristics"]
            batch_score = validation_result["score"]
            batch_issues = validation_result["issues"]
            batch_iterations = validation_result["iterations"]

            # Check missing fields
            got_nonempty_names = set()
            for c in batch_charcs:
                nm = c.get("name")
                if not nm:
                    continue
                if is_empty_value(c):
                    continue
                got_nonempty_names.add(nm)

            expected_names = {n for n in batch_names if n}
            missing = expected_names - got_nonempty_names

            if missing:
                log(f"  ⚠️ Missing fields in batch: {missing}")

                should_retry = missing - skip_names
                should_ignore = missing & skip_names

                if should_ignore:
                    log(f"  ℹ️ Ignoring conditional_skip fields: {should_ignore}")

                if not should_retry:
                    log(f"  ✅ All missing fields are conditional_skip, continuing...")
                else:
                    log(f"  🔄 Retrying only for: {should_retry}")

                    retry_meta = [m for m in batch_meta if m.get("name") in should_retry]

                    if retry_meta:
                        retry_validation = process_batch(retry_meta, list(should_retry))
                        retry_charcs = retry_validation["characteristics"]

                        got_names_after = {
                            c.get("name") for c in batch_charcs if c.get("name")
                        }
                        for ch in retry_charcs:
                            nm = ch.get("name")
                            if nm and nm not in got_names_after:
                                batch_charcs.append(ch)
                                got_names_after.add(nm)

                        batch_score = max(batch_score, retry_validation["score"])
                        batch_issues.extend(retry_validation["issues"])
                        batch_iterations += retry_validation["iterations"]

            all_charcs.extend(batch_charcs)
            batch_scores.append(batch_score)
            all_issues.extend(batch_issues)
            total_iterations += batch_iterations

            log(f"  ✅ Batch done: score={batch_score}, fields={len(batch_charcs)}")

        overall_score = int(sum(batch_scores) / len(batch_scores)) if batch_scores else 0

        # Fixed data fallback
        if fixed_data:
            for ch in all_charcs:
                name = ch.get("name")
                if not name:
                    continue
                if name in fixed_data and is_empty_value(ch):
                    ch["value"] = list(fixed_data[name])

        return {
            "characteristics": all_charcs,
            "score": overall_score,
            "iterations": total_iterations,
            "issues": all_issues,
        }

    def _build_full_characteristics(
        self,
        charcs_meta_raw: list,
        fixed_row: Dict[str, Any],
        ai_charcs: List[Dict[str, Any]],
        detected_colors: List[str],
        fixed_fields: List[Dict[str, Any]],
        conditional_skip: Optional[List[Dict[str, Any]]],
        conditional_fill: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Final characteristics:

        - AI generated (faqat generate_fields_for_ai dan)
        - Fixed (Excel’dan – HAR DOIM ustun bo‘ladi)
        - Conditional skip (doim bo‘sh)
        - Color (alohida qo‘shiladi, agar yo‘q bo‘lsa)
        """

        # AI generated + color qo‘shish
        charcs: List[Dict[str, Any]] = list(ai_charcs or [])

        charcs = self._add_color_to_characteristics(
            charcs,
            detected_colors,
            charcs_meta_raw,
        )

        # name -> char map (AI natijasi)
        name_to_char: Dict[str, Dict[str, Any]] = {}
        for ch in charcs:
            name = ch.get("name")
            if not name:
                continue
            name_to_char[name] = ch

        # Excel fixed values map
        fixed_values_map: Dict[str, List[str]] = {}
        if fixed_row:
            fixed_row_clean = fixed_row.copy()
            if fixed_row_clean:
                first_key = list(fixed_row_clean.keys())[0]
                fixed_row_clean.pop(first_key, None)

            for name, raw_value in fixed_row_clean.items():
                if not raw_value:
                    continue
                parts = [
                    p.strip()
                    for p in str(raw_value).replace(";", ",").split(",")
                    if p.strip()
                ]
                if parts:
                    fixed_values_map[name] = parts

        fixed_ids = {f.get("charcID") for f in fixed_fields if f.get("charcID")}
        skip_ids = {
            f.get("charcID")
            for f in (conditional_skip or [])
            if f.get("charcID")
        }

        full_result: List[Dict[str, Any]] = []

        for meta in charcs_meta_raw:
            name = meta.get("name")
            if not name:
                continue

            meta_id = meta.get("charcID")

            # CONDITIONAL SKIP → doim bo‘sh
            if meta_id in skip_ids:
                full_result.append(
                    {
                        "id": meta_id,
                        "name": name,
                        "value": [],
                    }
                )
                continue

            # EXCEL USTUNI BO'LSA → HAR DOIM Excel qiymati
            if name in fixed_values_map or meta_id in fixed_ids:
                value = fixed_values_map.get(name, [])
                full_result.append(
                    {
                        "id": meta_id,
                        "name": name,
                        "value": value,
                    }
                )
                continue

            # Qolganlari → AI natijasi yoki bo‘sh
            existing = name_to_char.get(name)
            if existing is not None:
                raw_value = existing.get("value", [])

                if isinstance(raw_value, str):
                    if "," in raw_value:
                        norm_value = [
                            v.strip()
                            for v in raw_value.split(",")
                            if v.strip()
                        ]
                    else:
                        norm_value = (
                            [raw_value.strip()] if raw_value.strip() else []
                        )
                elif isinstance(raw_value, list):
                    norm_value = [
                        str(v).strip()
                        for v in raw_value
                        if str(v).strip()
                    ]
                elif raw_value is None:
                    norm_value = []
                else:
                    norm_value = (
                        [str(raw_value).strip()]
                        if str(raw_value).strip()
                        else []
                    )
            else:
                norm_value = []

            full_result.append(
                {
                    "id": meta_id,
                    "name": name,
                    "value": norm_value,
                }
            )

        full_result = self._apply_conditional_fill_rules(
            full_charcs=full_result,
            conditional_fill=conditional_fill,
        )

        return full_result
    
    def _apply_conditional_fill_rules(
            self,
            full_charcs: List[Dict[str, Any]],
            conditional_fill: Optional[List[Dict[str, Any]]],
        ) -> List[Dict[str, Any]]:
            if not conditional_fill:
                return full_charcs

            values_by_name: Dict[str, List[str]] = {
                ch.get("name"): ch.get("value", []) or []
                for ch in full_charcs
                if ch.get("name")
            }

            for meta in conditional_fill:
                cond = meta.get("condition") or {}
                action = cond.get("action")

                if action != "fill":
                    continue

                target_name = meta.get("name") 
                cond_field_name = cond.get("field") 
                cond_values = cond.get("values") or []

                if not target_name or not cond_field_name or not cond_values:
                    continue

                # boshqaruvchi maydon qiymatlari
                control_values = {
                    str(v).strip()
                    for v in values_by_name.get(cond_field_name, [])
                    if str(v).strip()
                }
                expected = {str(v).strip() for v in cond_values if str(v).strip()}

                # Shart: control_values ∩ expected bo'lsa -> fill qilishga ruxsat
                should_fill = bool(control_values & expected)

                # Agar shart bajarilmasa -> target field majburan bo'shatiladi
                if not should_fill:
                    for ch in full_charcs:
                        if ch.get("name") == target_name:
                            ch["value"] = []
                            break

            return full_charcs