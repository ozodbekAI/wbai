# routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr

from core.dependencies import get_current_user, require_admin
from core.database import get_db_dependency
from repositories.user_repository import UserRepository
from models.user import UserRole


router = APIRouter(prefix="/admin", tags=["users-admin"])


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class PasswordUpdate(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=100)


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str]

    class Config:
        from_attributes = True


@router.post("/users", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(require_admin),
):
    """Create new user (admin only)"""
    try:
        repo = UserRepository(db)
        user = repo.create_user(
            username=data.username,
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            role=data.role,
        )

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            last_login=user.last_login.isoformat() if user.last_login else None,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(require_admin),
):
    """Get all users (admin only)"""
    repo = UserRepository(db)

    role_filter = None
    if role:
        try:
            role_filter = UserRole[role.upper()]
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {role}",
            )

    users = repo.get_all_users(
        skip=skip,
        limit=limit,
        role=role_filter,
        is_active=is_active,
    )

    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            is_active=u.is_active,
            created_at=u.created_at.isoformat(),
            last_login=u.last_login.isoformat() if u.last_login else None,
        )
        for u in users
    ]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(require_admin),
):
    """Get user by ID (admin only)"""
    repo = UserRepository(db)
    user = repo.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        last_login=user.last_login.isoformat() if user.last_login else None,
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(require_admin),
):
    """Update user (admin only)"""
    try:
        repo = UserRepository(db)
        user = repo.update_user(
            user_id=user_id,
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            is_active=data.is_active,
        )

        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            last_login=user.last_login.isoformat() if user.last_login else None,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/users/{user_id}/password")
async def update_user_password(
    user_id: int,
    data: PasswordUpdate,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(require_admin),
):
    """Update user password (admin only)"""
    try:
        repo = UserRepository(db)
        repo.update_password(user_id, data.new_password)
        return {"message": "Password updated successfully"}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(require_admin),
):
    """Deactivate user (admin only)"""
    try:
        repo = UserRepository(db)
        repo.delete_user(user_id)
        return {"message": "User deactivated successfully"}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# Oddiy user uchun o'z profilini olish
@router.get("/users/me", response_model=UserResponse)
async def get_me(
    db: Session = Depends(get_db_dependency),
    current_user: dict = Depends(get_current_user),
):
    """Get current logged-in user info"""
    repo = UserRepository(db)
    user = repo.get_by_id(current_user["user_id"])

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        last_login=user.last_login.isoformat() if user.last_login else None,
    )
