from routers.auth import router as auth_router
from routers.process import router as process_router
from routers.health import router as health_router
from routers.admin.admin_promts import router as admin_promts

__all__ = ["auth_router", "process_router", "health_router", "admin_promts"]

