# backend/repositories/model_repository.py

from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import Optional, List, Dict

from models import ModelCategory, ModelSubcategory, ModelItem


class ModelRepository:
    def __init__(self, session: Session):
        self.session = session

    # ===== CATEGORY =====

    def get_all_categories(self) -> List[ModelCategory]:
        result = self.session.execute(
            select(ModelCategory)
            .where(ModelCategory.is_active == True)
            .order_by(ModelCategory.order_index)
        )
        return list(result.scalars().all())

    def get_category(self, category_id: int) -> Optional[ModelCategory]:
        result = self.session.execute(
            select(ModelCategory).where(ModelCategory.id == category_id)
        )
        return result.scalar_one_or_none()

    def add_category(self, name: str, order_index: int = 0) -> ModelCategory:
        cat = ModelCategory(name=name, order_index=order_index)
        self.session.add(cat)
        self.session.commit()
        self.session.refresh(cat)
        return cat

    def delete_category(self, category_id: int):
        self.session.execute(
            delete(ModelCategory).where(ModelCategory.id == category_id)
        )
        self.session.commit()

    # ===== SUBCATEGORY =====

    def get_subcategories_by_category(self, category_id: int) -> List[ModelSubcategory]:
        result = self.session.execute(
            select(ModelSubcategory)
            .where(
                ModelSubcategory.category_id == category_id,
                ModelSubcategory.is_active == True,
            )
            .order_by(ModelSubcategory.order_index)
        )
        return list(result.scalars().all())

    def get_subcategory(self, sub_id: int) -> Optional[ModelSubcategory]:
        result = self.session.execute(
            select(ModelSubcategory).where(ModelSubcategory.id == sub_id)
        )
        return result.scalar_one_or_none()

    def add_subcategory(
        self,
        category_id: int,
        name: str,
        order_index: int = 0,
    ) -> ModelSubcategory:
        sub = ModelSubcategory(
            category_id=category_id,
            name=name,
            order_index=order_index,
        )
        self.session.add(sub)
        self.session.commit()
        self.session.refresh(sub)
        return sub

    def delete_subcategory(self, sub_id: int):
        self.session.execute(
            delete(ModelSubcategory).where(ModelSubcategory.id == sub_id)
        )
        self.session.commit()

    # ===== ITEM (PROMPT) =====

    def get_items_by_subcategory(self, sub_id: int) -> List[ModelItem]:
        result = self.session.execute(
            select(ModelItem)
            .where(
                ModelItem.subcategory_id == sub_id,
                ModelItem.is_active == True,
            )
            .order_by(ModelItem.order_index)
        )
        return list(result.scalars().all())

    def get_item(self, item_id: int) -> Optional[ModelItem]:
        result = self.session.execute(
            select(ModelItem).where(ModelItem.id == item_id)
        )
        return result.scalar_one_or_none()

    def add_item(
        self,
        subcategory_id: int,
        name: str,
        prompt: str,
        order_index: int = 0,
    ) -> ModelItem:
        item = ModelItem(
            subcategory_id=subcategory_id,
            name=name,
            prompt=prompt,
            order_index=order_index,
        )
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def update_item(
        self,
        item_id: int,
        name: str,
        prompt: str,
    ) -> Optional[ModelItem]:
        result = self.session.execute(
            select(ModelItem).where(ModelItem.id == item_id)
        )
        item = result.scalar_one_or_none()
        if item:
            item.name = name
            item.prompt = prompt
            self.session.commit()
            self.session.refresh(item)
        return item

    def delete_item(self, item_id: int):
        self.session.execute(
            delete(ModelItem).where(ModelItem.id == item_id)
        )
        self.session.commit()

    # OPTIONAL – butun daraxt
    def get_full_hierarchy(self) -> Dict:
        result = self.session.execute(
            select(ModelCategory)
            .order_by(ModelCategory.order_index)
        )
        cats = result.scalars().all()

        hierarchy: Dict[int, Dict] = {}
        for cat in cats:
            hierarchy[cat.id] = {
                "name": cat.name,
                "subcategories": {},
            }
            for sub in cat.subcategories:
                if not sub.is_active:
                    continue
                hierarchy[cat.id]["subcategories"][sub.id] = {
                    "name": sub.name,
                    "items": [
                        {
                            "id": item.id,
                            "name": item.name,
                            "prompt": item.prompt,
                        }
                        for item in sub.items
                        if item.is_active
                    ],
                }
        return hierarchy
