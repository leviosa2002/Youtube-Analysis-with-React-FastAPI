"""
Pydantic models for API responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ============================================================================
# Channel Models
# ============================================================================

class ChannelInfo(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    custom_url: Optional[str] = None
    published_at: datetime
    country: Optional[str] = None
    view_count: int
    subscriber_count: int
    video_count: int
    thumbnail_url: Optional[str] = None

class ChannelAnalytics(BaseModel):
    channel_info: ChannelInfo
    growth_data: List[Dict[str, Any]]
    upload_frequency: Dict[str, Any]
    top_keywords: List[Dict[str, Any]]
    recent_videos: List[Dict[str, Any]]

# ============================================================================
# Video Models
# ============================================================================

class VideoInfo(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    published_at: datetime
    channel_id: str
    channel_title: str
    duration: str
    view_count: int
    like_count: int
    comment_count: int
    tags: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None

# NEW: Model for individual comment sentiment detail
class CommentSentimentDetail(BaseModel):
    comment_id: str
    text: str
    author: str
    published_at: Optional[str] = None # Using str here as isoformat() is returned
    like_count: int
    reply_count: int
    sentiment_score: float
    sentiment_label: str
    positive_score: float
    negative_score: float
    neutral_score: float

# NEW: Model for the detailed sentiment analysis block
class DetailedSentimentAnalysis(BaseModel):
    all_comments_sentiment: List[CommentSentimentDetail]
    top_positive_comments: List[CommentSentimentDetail]
    top_neutral_comments: List[CommentSentimentDetail]
    top_negative_comments: List[CommentSentimentDetail]
    total_comments_analyzed: int


class CommentAnalysis(BaseModel):
    total_comments: int
    analyzed_comments: int
    sentiment_scores: Dict[str, float]
    sentiment_distribution: Dict[str, int]
    keywords: List[Dict[str, Any]]
    toxicity_analysis: Dict[str, Any]
    # NEW: Add the detailed sentiment analysis field here
    sentiment_analysis: Optional[DetailedSentimentAnalysis] = None # Make it Optional for cases where it's not included
    
    # Also include the aggregate overall metrics at the top level of comment_analysis
    # These are derived in video.py from the detailed results
    overall_sentiment: Optional[str] = None
    sentiment_strength: Optional[str] = None
    polarization_index: Optional[float] = None
    sentiment_percentages: Optional[Dict[str, float]] = None


class VideoAnalytics(BaseModel):
    video_info: VideoInfo
    engagement_metrics: Dict[str, float]
    comment_analysis: CommentAnalysis
    performance_insights: Dict[str, Any]

# ============================================================================
# Trending Models
# ============================================================================

class TrendingVideo(BaseModel):
    id: str
    title: str
    channel_title: str
    published_at: datetime
    view_count: int
    like_count: int
    comment_count: int
    category_id: str
    duration: str
    engagement_rate: float
    thumbnail_url: Optional[str] = None

class TrendingAnalysis(BaseModel):
    videos: List[TrendingVideo]
    country: str
    category_filter: Optional[str] = None
    velocity_data: List[Dict[str, Any]]
    category_distribution: Dict[str, int]

# ============================================================================
# Comparison Models
# ============================================================================

class ChannelComparison(BaseModel):
    channels: List[ChannelInfo]
    comparison_metrics: Dict[str, List[float]]
    rankings: Dict[str, List[Dict[str, Any]]]
    insights: List[str]

class VideoComparison(BaseModel):
    videos: List[VideoInfo]
    comparison_metrics: Dict[str, List[float]]
    engagement_comparison: Dict[str, Any]
    insights: List[str]

# ============================================================================
# Common Response Models
# ============================================================================

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ExportResponse(BaseModel):
    filename: str
    download_url: str
    file_size: int
    format: str = "csv"
    timestamp: datetime = Field(default_factory=datetime.now)

# ============================================================================
# Search and Filter Models
# ============================================================================

class SearchFilters(BaseModel):
    country: Optional[str] = "US"
    category_id: Optional[str] = None
    max_results: int = Field(default=50, le=50)
    published_after: Optional[datetime] = None
    published_before: Optional[datetime] = None

class AnalysisOptions(BaseModel):
    include_comments: bool = True
    include_keywords: bool = True
    include_sentiment: bool = True
    include_toxicity: bool = True
    max_comments: int = Field(default=500, le=500)