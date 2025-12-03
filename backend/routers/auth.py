# routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from schemas.auth import LoginRequest, TokenResponse, RegisterRequest
from controllers.auth_controller import AuthController
from core.database import get_db_dependency


router = APIRouter(prefix="/auth", tags=["auth"])
auth_controller = AuthController()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db_dependency),
):
    try:
        return await auth_controller.login(request, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/register", response_model=TokenResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db_dependency),
):
    try:
        return await auth_controller.register(request, db)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
