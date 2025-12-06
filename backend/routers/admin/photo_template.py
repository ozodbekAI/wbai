# backend/routers/admin/photo_templates_admin.py

from fastapi import APIRouter, Depends, HTTPException, Response
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
    SceneCategoryCreate,
    SceneCategoryUpdate,
    SceneSubcategoryCreate,
    SceneSubcategoryUpdate,
    SceneItemCreate,
    SceneItemUpdate,
    PoseGroupCreate,
    PoseGroupUpdate,
    PoseSubgroupCreate,
    PoseSubgroupUpdate,
    PosePromptCreate,
    PosePromptUpdate,
)
from models import (
    SceneCategory,
    SceneSubcategory,
    SceneItem,
    PoseGroup,
    PoseSubgroup,
    PosePrompt,
)
from core.dependencies import get_current_user  # yoki get_current_admin_user


router = APIRouter(
    prefix="/api/admin/photo",
    tags=["Admin - Photo templates"],
    dependencies=[Depends(get_current_user)],
)

# ========== SCENES ==========


@router.post("/scenes/categories", response_model=SceneCategoryOut)
async def create_scene_category(
    body: SceneCategoryCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    category = repo.add_category(
        name=body.name,
        order_index=body.order_index,
    )
    return category


@router.put("/scenes/categories/{category_id}", response_model=SceneCategoryOut)
async def update_scene_category(
    category_id: int,
    body: SceneCategoryUpdate,
    db: Session = Depends(get_db_dependency),
):
    category = db.get(SceneCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Scene category not found")

    if body.name is not None:
        category.name = body.name
    if body.order_index is not None:
        category.order_index = body.order_index

    db.commit()
    db.refresh(category)
    return category


@router.delete("/scenes/categories/{category_id}", status_code=204)
async def delete_scene_category(
    category_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    repo.delete_category(category_id)
    return Response(status_code=204)


@router.post(
    "/scenes/categories/{category_id}/subcategories",
    response_model=SceneSubcategoryOut,
)
async def create_scene_subcategory(
    category_id: int,
    body: SceneSubcategoryCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)

    category = repo.get_category(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Scene category not found")

    subcat = repo.add_subcategory(
        category_id=category_id,
        name=body.name,
        order_index=body.order_index,
    )
    return subcat


@router.put("/scenes/subcategories/{subcat_id}", response_model=SceneSubcategoryOut)
async def update_scene_subcategory(
    subcat_id: int,
    body: SceneSubcategoryUpdate,
    db: Session = Depends(get_db_dependency),
):
    subcat = db.get(SceneSubcategory, subcat_id)
    if not subcat:
        raise HTTPException(status_code=404, detail="Scene subcategory not found")

    if body.name is not None:
        subcat.name = body.name
    if body.order_index is not None:
        subcat.order_index = body.order_index

    db.commit()
    db.refresh(subcat)
    return subcat


@router.delete("/scenes/subcategories/{subcat_id}", status_code=204)
async def delete_scene_subcategory(
    subcat_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    repo.delete_subcategory(subcat_id)
    return Response(status_code=204)


@router.post(
    "/scenes/subcategories/{subcat_id}/items",
    response_model=SceneItemOut,
)
async def create_scene_item(
    subcat_id: int,
    body: SceneItemCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    subcat = repo.get_subcategory(subcat_id)
    if not subcat:
        raise HTTPException(status_code=404, detail="Scene subcategory not found")

    item = repo.add_item(
        subcategory_id=subcat_id,
        name=body.name,
        prompt=body.prompt,
        order_index=body.order_index,
    )
    return item


@router.put("/scenes/items/{item_id}", response_model=SceneItemOut)
async def update_scene_item(
    item_id: int,
    body: SceneItemUpdate,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    item = repo.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Scene item not found")

    updated = repo.update_item(
        item_id=item_id,
        name=body.name or item.name,
        prompt=body.prompt or item.prompt,
    )
    if body.order_index is not None:
        updated.order_index = body.order_index
        db.commit()
        db.refresh(updated)

    return updated


@router.delete("/scenes/items/{item_id}", status_code=204)
async def delete_scene_item(
    item_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = SceneCategoryRepository(db)
    repo.delete_item(item_id)
    return Response(status_code=204)


# ========== POSES ==========


@router.post("/poses/groups", response_model=PoseGroupOut)
async def create_pose_group(
    body: PoseGroupCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    group = repo.add_group(
        name=body.name,
        order_index=body.order_index,
    )
    return group


@router.put("/poses/groups/{group_id}", response_model=PoseGroupOut)
async def update_pose_group(
    group_id: int,
    body: PoseGroupUpdate,
    db: Session = Depends(get_db_dependency),
):
    group = db.get(PoseGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Pose group not found")

    if body.name is not None:
        group.name = body.name
    if body.order_index is not None:
        group.order_index = body.order_index

    db.commit()
    db.refresh(group)
    return group


@router.delete("/poses/groups/{group_id}", status_code=204)
async def delete_pose_group(
    group_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    repo.delete_group(group_id)
    return Response(status_code=204)


@router.post(
    "/poses/groups/{group_id}/subgroups",
    response_model=PoseSubgroupOut,
)
async def create_pose_subgroup(
    group_id: int,
    body: PoseSubgroupCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    group = repo.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Pose group not found")

    subgroup = repo.add_subgroup(
        group_id=group_id,
        name=body.name,
        order_index=body.order_index,
    )
    return subgroup


@router.put("/poses/subgroups/{subgroup_id}", response_model=PoseSubgroupOut)
async def update_pose_subgroup(
    subgroup_id: int,
    body: PoseSubgroupUpdate,
    db: Session = Depends(get_db_dependency),
):
    subgroup = db.get(PoseSubgroup, subgroup_id)
    if not subgroup:
        raise HTTPException(status_code=404, detail="Pose subgroup not found")

    if body.name is not None:
        subgroup.name = body.name
    if body.order_index is not None:
        subgroup.order_index = body.order_index

    db.commit()
    db.refresh(subgroup)
    return subgroup


@router.delete("/poses/subgroups/{subgroup_id}", status_code=204)
async def delete_pose_subgroup(
    subgroup_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    repo.delete_subgroup(subgroup_id)
    return Response(status_code=204)


@router.post(
    "/poses/subgroups/{subgroup_id}/prompts",
    response_model=PosePromptOut,
)
async def create_pose_prompt(
    subgroup_id: int,
    body: PosePromptCreate,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    subgroup = repo.get_subgroup(subgroup_id)
    if not subgroup:
        raise HTTPException(status_code=404, detail="Pose subgroup not found")

    prompt = repo.add_prompt(
        subgroup_id=subgroup_id,
        name=body.name,
        prompt=body.prompt,
        order_index=body.order_index,
    )
    return prompt


@router.put("/poses/prompts/{prompt_id}", response_model=PosePromptOut)
async def update_pose_prompt(
    prompt_id: int,
    body: PosePromptUpdate,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    current = repo.get_prompt(prompt_id)
    if not current:
        raise HTTPException(status_code=404, detail="Pose prompt not found")

    updated = repo.update_prompt(
        prompt_id=prompt_id,
        name=body.name or current.name,
        prompt=body.prompt or current.prompt,
    )
    if body.order_index is not None:
        updated.order_index = body.order_index
        db.commit()
        db.refresh(updated)

    return updated


@router.delete("/poses/prompts/{prompt_id}", status_code=204)
async def delete_pose_prompt(
    prompt_id: int,
    db: Session = Depends(get_db_dependency),
):
    repo = PoseRepository(db)
    repo.delete_prompt(prompt_id)
    return Response(status_code=204)
