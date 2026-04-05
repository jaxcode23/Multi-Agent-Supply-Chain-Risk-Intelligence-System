from fastapi import APIRouter

# Import individual routers (each file defines a `router`)
from .health import router as health_router

# Define the main API router
main_api_router = APIRouter()

# Include all sub-routers with tags for documentation
main_api_router.include_router(health_router, prefix="/health", tags=["Health"])

