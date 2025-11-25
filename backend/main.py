from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import auth_router, process_router, health_router, admin_promts
from core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Application starting...")
    yield
    print("🛑 Application shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(process_router, prefix="/api/process", tags=["process"])
app.include_router(health_router, prefix="/api", tags=["health"])

app.include_router(admin_promts, prefix="/api/admin", tags=["admin"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )