# backend/repositories/model_repository.py

from typing import List, Optional
from sqlalchemy.orm import Session

# Sening modellaring shu faylda: models/normalize_models.py
# ichida ModelCategory, ModelSubcategory, ModelItem bor
from models.generator import (
    ModelCategory,
    ModelSubcategory,
    ModelItem,
)


class ModelRepository:
    def __init__(self, db: Session):
        self.db = db

    # ==== CATEGORIES ====
    def list_categories(self) -> List[ModelCategory]:
        return (
            self.db.query(ModelCategory)
            .filter(ModelCategory.is_active == True)
            .order_by(ModelCategory.order_index, ModelCategory.id)
            .all()
        )

    def get_category(self, category_id: int) -> Optional[ModelCategory]:
        return (
            self.db.query(ModelCategory)
            .filter(
                ModelCategory.id == category_id,
                ModelCategory.is_active == True,
            )
            .first()
        )

    # ==== SUBCATEGORIES ====
    def list_subcategories_by_category(
        self, category_id: int
    ) -> List[ModelSubcategory]:
        return (
            self.db.query(ModelSubcategory)
            .filter(
                ModelSubcategory.category_id == category_id,
                ModelSubcategory.is_active == True,
            )
            .order_by(ModelSubcategory.order_index, ModelSubcategory.id)
            .all()
        )

    def get_subcategory(self, subcategory_id: int) -> Optional[ModelSubcategory]:
        return (
            self.db.query(ModelSubcategory)
            .filter(
                ModelSubcategory.id == subcategory_id,
                ModelSubcategory.is_active == True,
            )
            .first()
        )

    # ==== ITEMS (TIPAJI) ====
    def list_items_by_subcategory(
        self, subcategory_id: int
    ) -> List[ModelItem]:
        return (
            self.db.query(ModelItem)
            .filter(
                ModelItem.subcategory_id == subcategory_id,
                ModelItem.is_active == True,
            )
            .order_by(ModelItem.order_index, ModelItem.id)
            .all()
        )

    def get_item(self, item_id: int) -> Optional[ModelItem]:
        return (
            self.db.query(ModelItem)
            .filter(
                ModelItem.id == item_id,
                ModelItem.is_active == True,
            )
            .first()
        )
