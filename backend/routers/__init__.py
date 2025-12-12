from routers.auth import router as auth_router
from routers.process import router as process_router
from routers.health import router as health_router
from routers.admin.admin_promts import router as admin_promts
from routers.photo_models import router as photo_models
from routers.photo_models import admin_router as admin_photo_models
from routers.photo_upload import router as photo_upload_router
from routers.video_scenarios import router as video_scenarios_router
from routers.admin.video_scenarios import router as admin_video_scenarios_router
from routers.photo_ui_config import router as photo_ui_config_router
from routers.photo_ui_config import router as photo_ui_config_router




__all__ = ["auth_router", "process_router", "health_router", "admin_promts", "photo_models", "admin_photo_models", "photo_upload_router", "video_scenarios_router", "admin_video_scenarios_router",
            "photo_ui_config_router", "photo_ui_config_router"]
