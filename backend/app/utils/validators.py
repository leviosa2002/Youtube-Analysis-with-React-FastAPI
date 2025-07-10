"""
Validation utilities for YouTube Analytics API
"""
import re
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, validator, Field

class YouTubeIDValidator:
    """Validator for YouTube IDs"""
    
    @staticmethod
    def validate_video_id(video_id: str) -> bool:
        """Validate YouTube video ID"""
        if not video_id or len(video_id) != 11:
            return False
        
        # YouTube video IDs contain alphanumeric characters, hyphens, and underscores
        pattern = r'^[a-zA-Z0-9_-]{11}$'
        return bool(re.match(pattern, video_id))
    
    @staticmethod
    def validate_channel_id(channel_id: str) -> bool:
        """Validate YouTube channel ID"""
        if not channel_id:
            return False
        
        # Channel IDs starting with UC (24 chars) or custom URLs
        if channel_id.startswith('UC') and len(channel_id) == 24:
            pattern = r'^UC[a-zA-Z0-9_-]{22}$'
            return bool(re.match(pattern, channel_id))
        
        # 2. YouTube Handle (@...)
        # Handles start with '@' followed by alphanumeric, periods, hyphens, underscores
        if channel_id.startswith('@'):
            # Allow length typically 3-30 after '@', but give some flexibility
            if 4 <= len(channel_id) <= 101: # 1 for '@' + 3 to 100 for handle name
                # Pattern includes '@' literally at the start, then the allowed handle characters
                pattern = r'^@[a-zA-Z0-9._-]+$'
                return bool(re.match(pattern, channel_id))
            return False # Handle too short or too long
        
        # Custom channel URLs (flexible length, alphanumeric + some special chars)
        if 3 <= len(channel_id) <= 100:
            pattern = r'^[a-zA-Z0-9._-]+$'
            return bool(re.match(pattern, channel_id))
        
        return False
    
    @staticmethod
    def validate_playlist_id(playlist_id: str) -> bool:
        """Validate YouTube playlist ID"""
        if not playlist_id:
            return False
        
        # Playlist IDs vary in format but typically start with PL, UU, etc.
        patterns = [
            r'^PL[a-zA-Z0-9_-]{32}$',  # Standard playlists
            r'^UU[a-zA-Z0-9_-]{22}$',  # Upload playlists
            r'^LL[a-zA-Z0-9_-]{22}$',  # Liked videos playlists
            r'^FL[a-zA-Z0-9_-]{22}$',  # Favorites playlists
        ]
        
        return any(re.match(pattern, playlist_id) for pattern in patterns)

class RequestValidators:
    """Request validation classes using Pydantic"""
    
    class ChannelAnalysisRequest(BaseModel):
        channel_id: str = Field(..., min_length=1, max_length=100)
        include_videos: bool = True
        max_videos: int = Field(default=50, ge=1, le=50)
        include_keywords: bool = True
        
        @validator('channel_id')
        def validate_channel_id(cls, v):
            if not YouTubeIDValidator.validate_channel_id(v):
                raise ValueError('Invalid YouTube channel ID format')
            return v
        
        # --- NEW FEATURE: Channel Lookup by Name Request ---
    class ChannelLookupByNameRequest(BaseModel):
        channel_name: str = Field(..., min_length=2, max_length=100, description="The name of the YouTube channel to search for.")

        @validator('channel_name')
        def validate_channel_name_format(cls, v):
            # Basic sanitization and format check for a channel name
            # Disallow characters that are typically not part of a channel name,
            # but allow spaces, numbers, and common punctuation.
            # This is a soft validation, actual existence is via API.
            if not re.match(r"^[a-zA-Z0-9\s._\-&'\"()!@#\$%^&*+=,\[\]{}|<>?`~;:]+$", v):
                raise ValueError("Channel name contains invalid characters.")
            return v.strip() # Strip leading/trailing whitespace

    # --- END NEW FEATURE ---
    
    class VideoAnalysisRequest(BaseModel):
        video_id: str = Field(..., min_length=11, max_length=11)
        include_comments: bool = True
        max_comments: int = Field(default=500, ge=1, le=500)
        include_sentiment: bool = True
        include_keywords: bool = True
        include_toxicity: bool = True
        
        @validator('video_id')
        def validate_video_id(cls, v):
            if not YouTubeIDValidator.validate_video_id(v):
                raise ValueError('Invalid YouTube video ID format')
            return v
    
    class TrendingAnalysisRequest(BaseModel):
        country: str = Field(default="US", min_length=2, max_length=2)
        category_id: Optional[str] = None
        max_results: int = Field(default=50, ge=1, le=50)
        
        @validator('country')
        def validate_country_code(cls, v):
            # Basic country code validation (2-letter ISO codes)
            if not re.match(r'^[A-Z]{2}$', v.upper()):
                raise ValueError('Country code must be 2-letter ISO format (e.g., US, GB, CA)')
            return v.upper()
        
        @validator('category_id')
        def validate_category_id(cls, v):
            if v is not None:
                # YouTube category IDs are numeric strings
                if not v.isdigit() or not (1 <= int(v) <= 44):
                    raise ValueError('Category ID must be a number between 1 and 44')
            return v
    
    class ChannelComparisonRequest(BaseModel):
        channel_ids: List[str] = Field(..., min_items=2, max_items=5)
        
        @validator('channel_ids')
        def validate_channel_ids(cls, v):
            if len(set(v)) != len(v):
                raise ValueError('Duplicate channel IDs are not allowed')
            
            for channel_id in v:
                if not YouTubeIDValidator.validate_channel_id(channel_id):
                    raise ValueError(f'Invalid channel ID format: {channel_id}')
            return v
    
    class VideoComparisonRequest(BaseModel):
        video_ids: List[str] = Field(..., min_items=2, max_items=5)
        
        @validator('video_ids')
        def validate_video_ids(cls, v):
            if len(set(v)) != len(v):
                raise ValueError('Duplicate video IDs are not allowed')
            
            for video_id in v:
                if not YouTubeIDValidator.validate_video_id(video_id):
                    raise ValueError(f'Invalid video ID format: {video_id}')
            return v

class DataValidators:
    """Data validation utilities"""
    
    @staticmethod
    def validate_date_range(start_date: Optional[str], end_date: Optional[str]) -> bool:
        """Validate date range"""
        if not start_date and not end_date:
            return True
        
        try:
            if start_date:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            if start_date and end_date:
                return start <= end
            
            return True
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_numeric_range(value: Any, min_val: float = None, max_val: float = None) -> bool:
        """Validate numeric value within range"""
        try:
            num_value = float(value)
            
            if min_val is not None and num_value < min_val:
                return False
            
            if max_val is not None and num_value > max_val:
                return False
            
            return True
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def sanitize_text_input(text: str, max_length: int = 1000) -> str:
        """Sanitize text input"""
        if not isinstance(text, str):
            return ""
        
        # Remove potentially harmful characters
        sanitized = re.sub(r'[<>"\']', '', text)
        
        # Limit length
        sanitized = sanitized[:max_length]
        
        # Remove excessive whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized)
        
        return sanitized.strip()
    
    @staticmethod
    def validate_pagination_params(page: int = 1, page_size: int = 20) -> Dict[str, int]:
        """Validate and normalize pagination parameters"""
        # Ensure page is at least 1
        page = max(1, int(page))
        
        # Limit page size
        page_size = max(1, min(100, int(page_size)))
        
        return {
            'page': page,
            'page_size': page_size,
            'offset': (page - 1) * page_size
        }

class SecurityValidators:
    """Security-related validators"""
    
    @staticmethod
    def validate_session_id(session_id: str) -> bool:
        """Validate session ID format"""
        if not session_id:
            return False
        
        # Session IDs should be UUIDs
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(uuid_pattern, session_id))
    
    @staticmethod
    def validate_api_key_format(api_key: str) -> bool:
        """Basic API key format validation"""
        if not api_key:
            return False
        
        # YouTube API keys are typically 35-40 characters, alphanumeric with some special chars
        if not (35 <= len(api_key) <= 50):
            return False
        
        # Should contain alphanumeric characters and possibly hyphens/underscores
        pattern = r'^[a-zA-Z0-9_-]+$'
        return bool(re.match(pattern, api_key))
    
    @staticmethod
    def check_rate_limit_headers(headers: Dict[str, Any]) -> Dict[str, Any]:
        """Check rate limit information from headers"""
        return {
            'remaining_quota': headers.get('x-ratelimit-remaining'),
            'quota_reset': headers.get('x-ratelimit-reset'),
            'quota_limit': headers.get('x-ratelimit-limit')
        }

class YouTubeCategoryValidator:
    """YouTube category validation"""
    
    # YouTube video categories (as of 2024)
    VALID_CATEGORIES = {
        '1': 'Film & Animation',
        '2': 'Autos & Vehicles',
        '10': 'Music',
        '15': 'Pets & Animals',
        '17': 'Sports',
        '18': 'Short Movies',
        '19': 'Travel & Events',
        '20': 'Gaming',
        '21': 'Videoblogging',
        '22': 'People & Blogs',
        '23': 'Comedy',
        '24': 'Entertainment',
        '25': 'News & Politics',
        '26': 'Howto & Style',
        '27': 'Education',
        '28': 'Science & Technology',
        '29': 'Nonprofits & Activism',
        '30': 'Movies',
        '31': 'Anime/Animation',
        '32': 'Action/Adventure',
        '33': 'Classics',
        '34': 'Comedy',
        '35': 'Documentary',
        '36': 'Drama',
        '37': 'Family',
        '38': 'Foreign',
        '39': 'Horror',
        '40': 'Sci-Fi/Fantasy',
        '41': 'Thriller',
        '42': 'Shorts',
        '43': 'Shows',
        '44': 'Trailers'
    }
    
    @staticmethod
    def validate_category_id(category_id: str) -> bool:
        """Validate YouTube category ID"""
        return category_id in YouTubeCategoryValidator.VALID_CATEGORIES
    
    @staticmethod
    def get_category_name(category_id: str) -> Optional[str]:
        """Get category name from ID"""
        return YouTubeCategoryValidator.VALID_CATEGORIES.get(category_id)
    
    @staticmethod
    def get_all_categories() -> Dict[str, str]:
        """Get all valid categories"""
        return YouTubeCategoryValidator.VALID_CATEGORIES.copy()