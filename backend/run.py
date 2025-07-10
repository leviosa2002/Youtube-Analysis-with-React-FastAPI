"""
YouTube Analytics App - Backend Server Runner
Run this file to start the FastAPI server
"""
import uvicorn
from app.main import app
from app.config import settings

if __name__ == "__main__":
    print("🚀 Starting YouTube Analytics API Server...")
    print("📚 API Documentation available at: http://localhost:8000/docs")
    print("⚡ Server running at: http://localhost:8000")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )