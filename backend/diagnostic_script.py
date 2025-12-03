"""
Diagnostic script to check which fields are missing in generator dictionary
"""
import json
from pathlib import Path

def check_missing_fields(subject_id: int = 177):
    """Check which generate fields are missing in generator dict"""
    
    # Load subject config
    config_path = Path("data/charcs") / f"{subject_id}.json"
    with config_path.open("r", encoding="utf-8") as f:
        config = json.load(f)
    
    # Load generator dict
    gen_dict_path = Path("data") / "Справочник генерация.json"
    with gen_dict_path.open("r", encoding="utf-8") as f:
        gen_dict = json.load(f)
    
    print(f"\n{'='*70}")
    print(f"Diagnostic for Subject ID: {subject_id} ({config['subjectName']})")
    print(f"{'='*70}\n")
    
    # Collect field types
    fixed_fields = []
    conditional_skip = []
    color_fields = []
    generate_fields = []
    
    for char in config["characteristics"]:
        name = char["name"]
        
        if char.get("is_fixed"):
            fixed_fields.append(name)
        elif char.get("is_color"):
            color_fields.append(name)
        elif char.get("is_conditional"):
            action = char.get("condition", {}).get("action", "skip")
            if action == "skip":
                conditional_skip.append(name)
            else:
                generate_fields.append(name)
        else:
            generate_fields.append(name)
    
    print(f"📊 Field Statistics:")
    print(f"   Fixed (Excel only):        {len(fixed_fields):3d} fields")
    print(f"   Conditional skip:          {len(conditional_skip):3d} fields")
    print(f"   Color (separate):          {len(color_fields):3d} fields")
    print(f"   Generate (AI):             {len(generate_fields):3d} fields")
    print(f"   {'─'*50}")
    print(f"   TOTAL:                     {len(config['characteristics']):3d} fields\n")
    
    # Check which generate fields are in dict
    in_dict = []
    not_in_dict = []
    
    for field in generate_fields:
        if field in gen_dict:
            in_dict.append(field)
        else:
            not_in_dict.append(field)
    
    print(f"✅ Generate fields WITH dictionary: {len(in_dict)}/{len(generate_fields)}")
    if in_dict:
        for field in sorted(in_dict):
            count = len(gen_dict[field])
            print(f"   ✓ {field:40s} ({count:3d} values)")
    
    print(f"\n⚠️  Generate fields WITHOUT dictionary: {len(not_in_dict)}/{len(generate_fields)}")
    if not_in_dict:
        for field in sorted(not_in_dict):
            print(f"   ✗ {field}")
    
    print(f"\n{'='*70}")
    print("SUMMARY:")
    print(f"{'='*70}")
    print(f"Total fields to send to AI:     {len(generate_fields)}")
    print(f"Fields with allowed_values:     {len(in_dict)}")
    print(f"Fields without allowed_values:  {len(not_in_dict)}")
    print(f"\nNote: Fields without dictionary are usually text fields like 'Комплектация'")
    print(f"      AI should generate free-form text for these fields.\n")
    
    return {
        "generate_fields": generate_fields,
        "in_dict": in_dict,
        "not_in_dict": not_in_dict,
        "stats": {
            "fixed": len(fixed_fields),
            "conditional_skip": len(conditional_skip),
            "color": len(color_fields),
            "generate": len(generate_fields),
            "with_dict": len(in_dict),
            "without_dict": len(not_in_dict),
        }
    }


if __name__ == "__main__":
    result = check_missing_fields(177)
    
    # Save report
    with open("diagnostic_report.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("📄 Full report saved to: diagnostic_report.json")