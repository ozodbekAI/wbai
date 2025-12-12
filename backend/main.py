from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import init_db

from routers import auth, process, process_batch, history
from routers.admin import users, admin_promts, keywords, photo_template
from routers import photo_templates, photo_generator, wb_media, wb_cards
from routers import photo_models, admin_photo_models 

from routers import photo_upload_router

from routers import video_scenarios_router, admin_video_scenarios_router

from routers.photo_ui_config import router as photo_ui_config_router

# Initialize database
init_db()

# Create FastAPI app
app = FastAPI(
    title="WB Content Generator API",
    version="2.0.0",
    description="Wildberries content generation and management system"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(process.router, prefix="/api/process", tags=["Processing"])
app.include_router(process_batch.router, prefix="/api/batch", tags=["Batch Processing"])
app.include_router(history.router, prefix="/api/history", tags=["History"])

app.include_router(users.router, prefix="/api/admin", tags=["Admin - Users"])
app.include_router(admin_promts.router, prefix="/api/admin", tags=["Admin - Prompts"])
app.include_router(keywords.router, prefix="/api/admin", tags=["Admin - Keywords"])
app.include_router(photo_template.router, prefix="", tags=["Admin - Photo Templates"])

app.include_router(photo_templates.router)
app.include_router(photo_generator.router)

app.include_router(wb_cards.router, prefix="/api", tags=["WB - Cards"])
app.include_router(wb_media.router, prefix="/api", tags=["WB - Media"])

# MUHIM: photo_models modulidagi ikkala routerni alohida ulaymiz
app.include_router(admin_photo_models)
app.include_router(photo_models)

app.include_router(photo_upload_router)

app.include_router(video_scenarios_router)
app.include_router(admin_video_scenarios_router)

app.include_router(photo_ui_config_router)

# Media fayllar
app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT), name="media")


@app.get("/")
async def root():
    return {
        "name": "WB Content Generator API",
        "version": "2.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "2.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
