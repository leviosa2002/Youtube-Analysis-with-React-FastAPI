"""
Configuration settings for YouTube Analytics App
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # YouTube API Configuration
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    YOUTUBE_API_SERVICE_NAME: str = "youtube"
    YOUTUBE_API_VERSION: str = "v3"
    
    # Application Configuration
    APP_NAME: str = "YouTube Analytics App"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # NEW: Add LOG_LEVEL attribute here
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper() # Read from env, default to INFO, ensure uppercase

    # API Configuration
    MAX_COMMENTS_PER_VIDEO: int = 500
    MAX_VIDEOS_PER_CHANNEL: int = 50
    MAX_TRENDING_VIDEOS: int = 50
    
    # CORS Configuration
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # Session Configuration
    SESSION_TIMEOUT: int = 3600  # 1 hour in seconds
    
    def validate_api_key(self) -> bool:
        """Validate if YouTube API key is provided"""
        return bool(self.YOUTUBE_API_KEY and self.YOUTUBE_API_KEY != "")

settings = Settings()