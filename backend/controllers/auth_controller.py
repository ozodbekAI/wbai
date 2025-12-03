# controllers/auth_controller.py
from datetime import timedelta
from sqlalchemy.orm import Session

from schemas.auth import LoginRequest, TokenResponse, RegisterRequest
from core.security import create_access_token, verify_password
from core.config import settings
from repositories.user_repository import UserRepository
from models.user import UserRole


class AuthController:
    async def login(self, request: LoginRequest, db: Session) -> TokenResponse:
        repo = UserRepository(db)

        user = repo.get_by_username(request.username)
        if not user:
            raise ValueError("Incorrect username or password")

        if not verify_password(request.password, user.hashed_password):
            raise ValueError("Incorrect username or password")

        if not user.is_active:
            raise ValueError("User is inactive")

        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        repo.update_last_login(user.id)

        return TokenResponse(
            access_token=access_token,
            username=user.username,
        )

    async def register(self, request: RegisterRequest, db: Session) -> TokenResponse:
        repo = UserRepository(db)

        try:
            user = repo.create_user(
                username=request.username,
                email=request.email,
                password=request.password,
                full_name=request.full_name,
                role=UserRole.USER,
            )
        except ValueError as e:
            raise ValueError(str(e))

        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        return TokenResponse(
            access_token=access_token,
            username=user.username,
        )
