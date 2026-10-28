from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import Base, engine
import app.models  # ensure models are registered
from app.api import auth, requests, responders, dashboard, notifications, sync, health

# Create DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Disaster Response and Coordination Platform (Problem ID: HACK-P437)",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local dev and preview hosts
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )

# Include API Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(health.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(requests.router, prefix=api_prefix)
app.include_router(responders.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(sync.router, prefix=api_prefix)

@app.get("/")
def root():
    return {
        "platform": "RESQNET",
        "tagline": "Intelligent Disaster Response and Coordination Platform",
        "disclaimer": "RESQNET is a demonstration prototype, not an official emergency dispatch service.",
        "api_docs": "/docs",
        "status": "online"
    }
