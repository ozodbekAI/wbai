# backend/routers/photo_models.py

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from core.dependencies import get_current_user
from repositories.model_repository import ModelRepository

# Public router
router = APIRouter(prefix="/api/photo/models", tags=["Photo Models"])

# Admin router
admin_router = APIRouter(prefix="/api/admin/photo/models", tags=["Admin - Photo Models"])


# === Pydantic schemas ===
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


class ModelCategoryOut(BaseModel):
    id: int
    name: str
    order_index: int

    class Config:
        from_attributes = True


class ModelSubcategoryOut(BaseModel):
    id: int
    name: str
    order_index: int

    class Config:
        from_attributes = True


class ModelItemOut(BaseModel):
    id: int
    name: str
    prompt: str
    order_index: int

    class Config:
        from_attributes = True


# === PUBLIC ENDPOINTS ===
@router.get("/categories", response_model=List[ModelCategoryOut])
async def list_categories(db: Session = Depends(get_db_dependency), user: dict = Depends(get_current_user)):
    repo = ModelRepository(db)
    return repo.list_categories()


@router.get("/subcategories", response_model=List[ModelSubcategoryOut])
async def list_subcategories(
    category_id: int = Query(..., ge=1),
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    repo = ModelRepository(db)
    return repo.list_subcategories_by_category(category_id)


@router.get("/items", response_model=List[ModelItemOut])
async def list_items(
    subcategory_id: int = Query(..., ge=1),
    db: Session = Depends(get_db_dependency),
    user: dict = Depends(get_current_user),
):
    repo = ModelRepository(db)
    return repo.list_items_by_subcategory(subcategory_id)


# === ADMIN ENDPOINTS ===
@admin_router.post("/categories", response_model=ModelCategoryOut)
def create_category(payload: ModelCategoryCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.add_category(payload.name, payload.order_index)


@admin_router.put("/categories/{category_id}", response_model=ModelCategoryOut)
def update_category(category_id: int, payload: ModelCategoryCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    updated = repo.update_category(category_id, payload.name, payload.order_index)
    if not updated:
        raise HTTPException(404, "Category not found")
    return updated


@admin_router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    repo.delete_category(category_id)
    return {"status": "ok"}


@admin_router.post("/categories/{category_id}/subcategories", response_model=ModelSubcategoryOut)
def create_subcategory(category_id: int, payload: ModelSubcategoryCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.add_subcategory(category_id, payload.name, payload.order_index)


@admin_router.put("/subcategories/{sub_id}", response_model=ModelSubcategoryOut)
def update_subcategory(sub_id: int, payload: ModelSubcategoryCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    updated = repo.update_subcategory(sub_id, payload.name, payload.order_index)
    if not updated:
        raise HTTPException(404, "Subcategory not found")
    return updated


@admin_router.delete("/subcategories/{sub_id}")
def delete_subcategory(sub_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    repo.delete_subcategory(sub_id)
    return {"status": "ok"}


@admin_router.post("/subcategories/{sub_id}/items", response_model=ModelItemOut)
def create_item(sub_id: int, payload: ModelItemCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    return repo.add_item(sub_id, payload.name, payload.prompt, payload.order_index)


@admin_router.put("/items/{item_id}", response_model=ModelItemOut)
def update_item(item_id: int, payload: ModelItemCreate, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    updated = repo.update_item(item_id, payload.name, payload.prompt, payload.order_index)
    if not updated:
        raise HTTPException(404, "Item not found")
    return updated


@admin_router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db_dependency)):
    repo = ModelRepository(db)
    repo.delete_item(item_id)
    return {"status": "ok"}