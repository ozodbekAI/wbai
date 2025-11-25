from datetime import timedelta

from schemas.auth import LoginRequest, TokenResponse
from core.security import authenticate_user, create_access_token
from core.config import settings


class AuthController:
    
    async def login(self, request: LoginRequest) -> TokenResponse:
        """Handle login"""
        if not authenticate_user(request.username, request.password):
            raise ValueError("Incorrect username or password")
        
        access_token = create_access_token(
            data={"sub": request.username},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return TokenResponse(
            access_token=access_token,
            username=request.username
        )