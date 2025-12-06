# backend/routers/photo_templates.py

from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from core.database import get_db_dependency
from repositories.scence_repositories import SceneCategoryRepository, PoseRepository
from schemas.photo import (
    SceneCategoryOut,
    SceneSubcategoryOut,
    SceneItemOut,
    PoseGroupOut,
    PoseSubgroupOut,
    PosePromptOut,
)

router = APIRouter(prefix="/api/photo", tags=["Photo templates"])


@router.get("/scenes/categories", response_model=List[SceneCategoryOut])
async def get_scene_categories(db: Session = Depends(get_db_dependency)):
    repo = SceneCategoryRepository(db)
    categories = repo.get_all_categories()
    return categories


@router.get(
    "/scenes/{category_id}/subcategories",
    response_model=List[SceneSubcategoryOut],
)
async def get_scene_subcategories(
    category_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    subcats = repo.get_subcategories_by_category(category_id)
    return subcats


@router.get(
    "/scenes/subcategories/{subcategory_id}/items",
    response_model=List[SceneItemOut],
)
async def get_scene_items(
    subcategory_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    items = repo.get_items_by_subcategory(subcategory_id)
    return items


@router.get("/poses/groups", response_model=List[PoseGroupOut])
async def get_pose_groups(db: Session = Depends(get_db_dependency)):
    repo = PoseRepository(db)
    groups = repo.get_all_groups()
    return groups


@router.get(
    "/poses/groups/{group_id}/subgroups",
    response_model=List[PoseSubgroupOut],
)
async def get_pose_subgroups(
    group_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    subgroups = repo.get_subgroups_by_group(group_id)
    return subgroups


@router.get(
    "/poses/subgroups/{subgroup_id}/prompts",
    response_model=List[PosePromptOut],
)
async def get_pose_prompts(
    subgroup_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    prompts = repo.get_prompts_by_subgroup(subgroup_id)
    return prompts
