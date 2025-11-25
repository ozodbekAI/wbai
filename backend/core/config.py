from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "WB Characteristics API"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    CORS_ORIGINS: List[str] = ["*"]

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin"

    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-5-mini"

    WB_API_KEY: str
    
    SCORE_OK_THRESHOLD: int = 90
    MAX_ITERATIONS: int = 3

    PROXY_URL: str = "http://11f1wsnM:mddvZFkM@156.233.82.121:63464"
    USE_PROXY: bool = True

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "wb_cards"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DATABASE_URL: str = None
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
