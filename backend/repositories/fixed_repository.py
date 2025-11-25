from typing import Dict, Any
import pandas as pd

from core.config import settings


class FixedRepository:
    
    def __init__(self):
        self.fixed_path = settings.DATA_DIR / "fixed.xlsx"
    
    def get_by_artikul(self, artikul_id: str) -> Dict[str, Any]:
        artikul_id = str(artikul_id).strip()
        
        if not self.fixed_path.exists():
            return {}
        
        df = pd.read_excel(self.fixed_path, dtype=str)
        if df.empty:
            return {}
        
        first_col_name = df.columns[0]
        matched = df[df[first_col_name].astype(str).str.strip() == artikul_id]
        
        if matched.empty:
            return {}
        
        row_dict = matched.to_dict(orient="records")[-1]
        
        cleaned = {}
        for k, v in row_dict.items():
            if isinstance(v, float) and pd.isna(v):
                continue
            if v is None:
                continue
            val = str(v).strip()
            if val == "":
                continue
            cleaned[k] = val
        
        return cleaned
