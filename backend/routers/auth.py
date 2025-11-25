from fastapi import APIRouter, HTTPException, status

from schemas.auth import LoginRequest, TokenResponse
from controllers.auth_controller import AuthController


router = APIRouter()
auth_controller = AuthController()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    try:
        return await auth_controller.login(request)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
