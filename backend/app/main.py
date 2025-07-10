"""
FastAPI main application for YouTube Analytics App
"""
import logging
from fastapi import FastAPI, HTTPException # Removed Depends as it's not directly used here
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager # For the lifespan event

from app.config import settings # Assuming app.config is now app.core.config
from app.routers import channel, video, trending, comparison
from app.utils.session_storage import SessionStorage


# --- NEW: Import only the necessary items from app.dependencies ---
from app.dependencies import ( # Import the functions and global variables from the new file
    load_nlp_models,
    _sentiment_analyzer, # Access global state for health check
    _toxicity_model,     # Access global state for health check
    _keyword_model       # Access global state for health check
)
# ------------------------------------------------------------------

# Initialize logger
logging.basicConfig(level=settings.LOG_LEVEL, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize session storage
session_storage = SessionStorage() # This can remain here or be a dependency itself if needed elsewhere

# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown events."""
    logger.info("Application startup initiated.")
    if not settings.validate_api_key():
        logger.warning("⚠️ WARNING: YouTube API key not found! Please set YOUTUBE_API_KEY in .env file.")
    else:
        logger.info("🔑 YouTube API key configured.")

    logger.info("Loading NLP models and initializing services...")
    await load_nlp_models() # Call the loading function from app.dependencies
    logger.info("Application startup completed successfully.")

    yield # This point marks the transition from startup to application running

    # Shutdown event
    logger.info("Application shutdown initiated.")
    session_storage.clear_all() # Or session_storage.cleanup_expired_sessions() if that's preferred
    logger.info("🛑 Application shutdown complete.")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="YouTube Analytics API for channel and video analysis",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan # Link the lifespan manager here
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(video.router, prefix="/api", tags=["Video Analysis"])
app.include_router(channel.router, prefix="/api", tags=["Channel Analysis"])
app.include_router(trending.router, prefix="/api", tags=["Trending Analysis"])
app.include_router(comparison.router, prefix="/api", tags=["Comparison Analysis"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.VERSION,
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    api_key_status = "configured" if settings.validate_api_key() else "missing"
    # Check status of NLP models using the global variables imported from app.dependencies
    nlp_model_status = {
        "sentiment_model_loaded": _sentiment_analyzer is not None,
        "toxicity_model_loaded": _toxicity_model is not None,
        "keyword_model_loaded": _keyword_model is not None
    }
    return {
        "status": "healthy",
        "api_key": api_key_status,
        "session_count": len(session_storage.sessions),
        "nlp_models": nlp_model_status
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(exc),
                "type": type(exc).__name__
            }
        )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )