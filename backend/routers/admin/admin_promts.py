# routers/admin/admin_promts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from core.dependencies import get_current_user
from core.database import get_db_dependency
from repositories.promt_repository import PromptRepository
from services.promnt_loader import PromptLoaderService

router = APIRouter()


class PromptCreate(BaseModel):
    prompt_type: str
    system_prompt: str
    strict_rules: Optional[str] = None
    examples: Optional[str] = None


class PromptUpdate(BaseModel):
    system_prompt: Optional[str] = None
    strict_rules: Optional[str] = None
    examples: Optional[str] = None
    change_reason: Optional[str] = None


class PromptResponse(BaseModel):
    id: int
    prompt_type: str
    system_prompt: str
    strict_rules: Optional[str] = None
    examples: Optional[str] = None
    version: int
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class PromptFullPreview(BaseModel):
    prompt_type: str
    version: int
    full_prompt: str
    components: dict


class PromptVersionInfo(BaseModel):
    id: int
    version: int
    created_at: str
    created_by: Optional[str]
    change_reason: Optional[str]


@router.get("/prompts", response_model=List[PromptResponse])
async def get_all_prompts(
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)
    prompts = repo.get_all_prompts()

    return [
        PromptResponse(
            id=p.id,
            prompt_type=p.prompt_type,
            system_prompt=p.system_prompt,
            strict_rules=p.strict_rules,
            examples=p.examples,
            version=p.version,
            is_active=p.is_active,
            created_at=p.created_at.isoformat() if p.created_at else "",
            updated_at=p.updated_at.isoformat() if p.updated_at else "",
        )
        for p in prompts
    ]


@router.get("/prompts/{prompt_type}", response_model=PromptResponse)
async def get_prompt(
    prompt_type: str,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)
    prompt = repo.get_active_prompt(prompt_type)

    if not prompt:
        raise HTTPException(status_code=404, detail=f"Промпт '{prompt_type}' не найден")

    return PromptResponse(
        id=prompt.id,
        prompt_type=prompt.prompt_type,
        system_prompt=prompt.system_prompt,
        strict_rules=prompt.strict_rules,
        examples=prompt.examples,
        version=prompt.version,
        is_active=prompt.is_active,
        created_at=prompt.created_at.isoformat() if prompt.created_at else "",
        updated_at=prompt.updated_at.isoformat() if prompt.updated_at else "",
    )


@router.get("/prompts/{prompt_type}/preview", response_model=PromptFullPreview)
async def preview_full_prompt(
    prompt_type: str,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    try:
        prompt_loader = PromptLoaderService(db)
        full_prompt = prompt_loader.get_full_prompt(prompt_type)

        repo = PromptRepository(db)
        prompt = repo.get_active_prompt(prompt_type)

        if not prompt:
            raise HTTPException(status_code=404, detail=f"Промпт '{prompt_type}' не найден")

        components = {
            "system_prompt": prompt.system_prompt,
            "strict_rules": prompt.strict_rules,
            "examples": prompt.examples,
            "static_rules": "Yes" if "СТРОГИЕ ЗАПРЕТЫ" in full_prompt else "No",
            "response_format": "Yes" if "ФОРМАТ ОТВЕТА" in full_prompt else "No",
        }

        return PromptFullPreview(
            prompt_type=prompt_type,
            version=prompt.version,
            full_prompt=full_prompt,
            components=components,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка формирования промпта: {str(e)}")


@router.post("/prompts", response_model=PromptResponse)
async def create_prompt(
    data: PromptCreate,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)

    try:
        prompt = repo.create_prompt(
            prompt_type=data.prompt_type,
            system_prompt=data.system_prompt,
            strict_rules=data.strict_rules,
            examples=data.examples,
            created_by_id=current_user.get("id"),
            created_by_username=current_user.get("username"),
        )
        return PromptResponse(
            id=prompt.id,
            prompt_type=prompt.prompt_type,
            system_prompt=prompt.system_prompt,
            strict_rules=prompt.strict_rules,
            examples=prompt.examples,
            version=prompt.version,
            is_active=prompt.is_active,
            created_at=prompt.created_at.isoformat() if prompt.created_at else "",
            updated_at=prompt.updated_at.isoformat() if prompt.updated_at else "",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/prompts/{prompt_type}", response_model=PromptResponse)
async def update_prompt(
    prompt_type: str,
    data: PromptUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)

    try:
        prompt = repo.update_prompt(
            prompt_type=prompt_type,
            system_prompt=data.system_prompt,
            strict_rules=data.strict_rules,
            examples=data.examples,
            updated_by_username=current_user.get("username"),
            change_reason=data.change_reason,
        )
        return PromptResponse(
            id=prompt.id,
            prompt_type=prompt.prompt_type,
            system_prompt=prompt.system_prompt,
            strict_rules=prompt.strict_rules,
            examples=prompt.examples,
            version=prompt.version,
            is_active=prompt.is_active,
            created_at=prompt.created_at.isoformat() if prompt.created_at else "",
            updated_at=prompt.updated_at.isoformat() if prompt.updated_at else "",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/prompts/{prompt_type}")
async def delete_prompt(
    prompt_type: str,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)
    prompt = repo.get_active_prompt(prompt_type)

    if not prompt:
        raise HTTPException(status_code=404, detail=f"Промпт '{prompt_type}' не найден")

    prompt.is_active = False
    db.commit()

    return {"message": f"Промпт '{prompt_type}' деактивирован"}


@router.get("/prompts/{prompt_type}/versions", response_model=List[PromptVersionInfo])
async def get_prompt_versions(
    prompt_type: str,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)
    versions = repo.get_prompt_versions(prompt_type)

    return [
        PromptVersionInfo(
            id=v.id,
            version=v.version,
            created_at=v.created_at.isoformat() if v.created_at else "",
            created_by=v.created_by,
            change_reason=v.change_reason,
        )
        for v in versions
    ]

@router.delete("/prompts/{prompt_type}")
async def delete_prompt(
    prompt_type: str,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)
    try:
        prompt = repo.set_prompt_active(prompt_type, False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "message": f"Промпт '{prompt_type}' деактивирован",
        "prompt_type": prompt.prompt_type,
        "is_active": prompt.is_active,
    }


@router.post("/prompts/{prompt_type}/activate", response_model=PromptResponse)
async def activate_prompt(
    prompt_type: str,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    repo = PromptRepository(db)

    try:
        prompt = repo.set_prompt_active(prompt_type, True)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return PromptResponse(
        id=prompt.id,
        prompt_type=prompt.prompt_type,
        system_prompt=prompt.system_prompt,
        strict_rules=prompt.strict_rules,
        examples=prompt.examples,
        version=prompt.version,
        is_active=prompt.is_active,
        created_at=prompt.created_at.isoformat() if prompt.created_at else "",
        updated_at=prompt.updated_at.isoformat() if prompt.updated_at else "",
    )

@router.get("/prompts/types/available")
async def get_available_prompt_types(
    current_user: dict = Depends(get_current_user),
):
    return {
        "types": [
            {
                "type": "title_generator",
                "description": "Генерация заголовков (title) для карточек",
                "category": "title",
            },
            {
                "type": "title_validator",
                "description": "Валидация заголовков",
                "category": "title",
            },
            {
                "type": "title_refiner",
                "description": "Исправление заголовков",
                "category": "title",
            },
            {
                "type": "description_generator",
                "description": "Генерация описаний (description) для карточек",
                "category": "description",
            },
            {
                "type": "description_validator",
                "description": "Валидация описаний",
                "category": "description",
            },
            {
                "type": "description_refiner",
                "description": "Исправление описаний",
                "category": "description",
            },
            {
                "type": "characteristics_generator",
                "description": "Генерация характеристик",
                "category": "characteristics",
            },
            {
                "type": "characteristics_validator",
                "description": "Валидация характеристик",
                "category": "characteristics",
            },
            {
                "type": "characteristics_refiner",
                "description": "Исправление характеристик",
                "category": "characteristics",
            },
            {
                "type": "color_detector_parent",
                "description": "Определение цветов на фото",
                "category": "color",
            },
            {
                "type": "color_detector_names",
                "description": "Определение цветов на фото",
                "category": "color",
            },
        ]
    }
