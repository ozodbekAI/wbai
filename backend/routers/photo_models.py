# backend/routers/photo_models.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from core.database import get_db_dependency
from repositories.model_repository import ModelRepository

router = APIRouter(
    prefix="/api/photo/models",
    tags=["Photo - Models (normalize)"],
)


class ModelCategoryCreate(BaseModel):
    name: str
    order_index: int = 0


class ModelSubcategoryCreate(BaseModel):
    name: str
    order_index: int = 0


class ModelItemCreate(BaseModel):
    name: str
    prompt: str
    order_index: int = 0


@router.get("/categories")
def list_categories(db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.get_all_categories()


@router.get("/categories/{category_id}/subcategories")
def list_subcategories(category_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.get_subcategories_by_category(category_id)


@router.get("/subcategories/{sub_id}/items")
def list_items(sub_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.get_items_by_subcategory(sub_id)


# ===== ADMIN CRUD (xuddi scene/pose kabi) =====

admin_router = APIRouter(
    prefix="/api/admin/photo/models",
    tags=["Admin - Photo Models"],
)


@admin_router.post("/categories")
def create_category(payload: ModelCategoryCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.add_category(payload.name, payload.order_index)


@admin_router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    repo.delete_category(category_id)
    return {"status": "ok"}


@admin_router.post("/categories/{category_id}/subcategories")
def create_subcategory(
    category_id: int,
    payload: ModelSubcategoryCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = ModelRepository(db)
    return repo.add_subcategory(category_id, payload.name, payload.order_index)


@admin_router.delete("/subcategories/{sub_id}")
def delete_subcategory(sub_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    repo.delete_subcategory(sub_id)
    return {"status": "ok"}


@admin_router.post("/subcategories/{sub_id}/items")
def create_item(
    sub_id: int,
    payload: ModelItemCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = ModelRepository(db)
    return repo.add_item(
        subcategory_id=sub_id,
        name=payload.name,
        prompt=payload.prompt,
        order_index=payload.order_index,
    )


@admin_router.put("/items/{item_id}")
def update_item(
    item_id: int,
    payload: ModelItemCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = ModelRepository(db)
    item = repo.update_item(
        item_id=item_id,
        name=payload.name,
        prompt=payload.prompt,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@admin_router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    repo.delete_item(item_id)
    return {"status": "ok"}
