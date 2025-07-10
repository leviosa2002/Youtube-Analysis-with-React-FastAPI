"""
Channel data models and processing classes
"""
from dataclasses import dataclass, field # Ensure 'field' is imported
from datetime import datetime, date, timedelta, timezone # Import timezone
from typing import List, Optional, Dict, Any
import pandas as pd
import re
from collections import Counter
from dateutil import parser # Import dateutil.parser
import logging # Import logging module

logger = logging.getLogger(__name__) # Get logger for this module

@dataclass
class ChannelData:
    """Raw channel data from YouTube API"""
    id: str
    title: str
    description: str
    custom_url: Optional[str]
    published_at: datetime # This should now consistently be a UTC-aware datetime
    country: Optional[str]
    view_count: int
    subscriber_count: int
    video_count: int
    thumbnail_url: str
    
    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> 'ChannelData':
        """Create ChannelData from YouTube API response"""
        snippet = data.get('snippet', {})
        statistics = data.get('statistics', {})
        
        published_at_str = snippet.get('publishedAt', '')
        parsed_published_at = None
        if published_at_str:
            try:
                parsed_published_at = parser.parse(published_at_str).astimezone(timezone.utc)
            except ValueError:
                logger.warning(f"Failed to parse published_at for channel {data.get('id', 'unknown')}: {published_at_str}")
        
        return cls(
            id=data.get('id', ''),
            title=snippet.get('title', ''),
            description=snippet.get('description', ''),
            custom_url=snippet.get('customUrl'),
            published_at=parsed_published_at, # Use the parsed, UTC-aware datetime
            country=snippet.get('country'),
            view_count=int(statistics.get('viewCount', 0)),
            subscriber_count=int(statistics.get('subscriberCount', 0)),
            video_count=int(statistics.get('videoCount', 0)),
            thumbnail_url=snippet.get('thumbnails', {}).get('high', {}).get('url', '')
        )

# Assuming CommentData is also in this file for completeness as it relates to VideoData
@dataclass
class CommentData:
    """Individual comment data"""
    id: str
    text: str
    author: str
    published_at: datetime # This should be a timezone-aware datetime
    like_count: int
    reply_count: int
    
    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> 'CommentData':
        """Create CommentData from YouTube API response"""
        snippet = data.get('snippet', {})
        top_comment = snippet.get('topLevelComment', {}).get('snippet', {})
        
        published_at_str = top_comment.get('publishedAt', '')
        parsed_published_at = None
        if published_at_str:
            try:
                parsed_published_at = parser.parse(published_at_str).astimezone(timezone.utc)
            except ValueError:
                logger.warning(f"Failed to parse published_at for comment {data.get('id', 'unknown')}: {published_at_str}")
        
        return cls(
            id=data.get('id', ''),
            text=top_comment.get('textDisplay', ''),
            author=top_comment.get('authorDisplayName', ''),
            published_at=parsed_published_at,
            like_count=int(top_comment.get('likeCount', 0)),
            reply_count=int(snippet.get('totalReplyCount', 0))
        )


@dataclass
class VideoData:
    """Video data for channel analysis"""
    id: str
    title: str
    published_at: datetime # This should now consistently be a UTC-aware datetime
    view_count: int
    like_count: int
    comment_count: int
    duration: str
    tags: List[str] = field(default_factory=list) # CORRECTED: Use field(default_factory=list)
    description: str = ""
    thumbnail_url: str = ""

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> 'VideoData':
        """Create VideoData from YouTube API response"""
        snippet = data.get('snippet', {})
        statistics = data.get('statistics', {})
        content_details = data.get('contentDetails', {})
        
        published_at_str = snippet.get('publishedAt', '')
        parsed_published_at = None
        if published_at_str:
            try:
                parsed_published_at = parser.parse(published_at_str).astimezone(timezone.utc)
            except ValueError:
                logger.warning(f"Failed to parse published_at for video {data.get('id', 'unknown')}: {published_at_str}")

        return cls(
            id=data.get('id', ''),
            title=snippet.get('title', ''),
            description=snippet.get('description', ''),
            published_at=parsed_published_at, # Use the parsed, UTC-aware datetime
            view_count=int(statistics.get('viewCount', 0)),
            like_count=int(statistics.get('likeCount', 0)),
            comment_count=int(statistics.get('commentCount', 0)),
            duration=content_details.get('duration', ''),
            tags=snippet.get('tags', []), # This is where tags from API are directly assigned
            thumbnail_url=snippet.get('thumbnails', {}).get('high', {}).get('url', '')
        )

# Analytics specific data models
@dataclass
class GrowthData:
    date: date # Use date type for consistency
    cumulative_views: int
    video_count: int
    monthly_views: int

@dataclass
class KeywordData:
    keyword: str
    count: int
    type: str # e.g., 'tag', 'title', 'general'
    relevance_score: float = 0.0
    percentage: float = 0.0
    
@dataclass
class UploadFrequencyData:
    average_days_between_uploads: Optional[float]
    last_upload_date: Optional[date]
    next_expected_upload_date: Optional[date]
    heatmap_data: List[Dict[str, Any]] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=dict)

# Main response models for API
@dataclass
class ChannelAnalyticsResponse:
    channel_info: Optional[ChannelData]
    growth_data: List[GrowthData] = field(default_factory=list)
    recent_videos: List[VideoData] = field(default_factory=list)
    top_keywords: List[KeywordData] = field(default_factory=list)
    upload_frequency: Optional[UploadFrequencyData] = None

# NEW MODEL FOR FLEXIBLE ENDPOINT
@dataclass
class FlexibleChannelInfoResponse:
    channel_info: Optional[ChannelData]
    recent_videos: List[VideoData] = field(default_factory=list)
    top_keywords: List[KeywordData] = field(default_factory=list)


class ChannelProcessor:
    """Process channel data for analytics"""
    
    @staticmethod
    def calculate_growth_trends(videos: List[VideoData]) -> List[GrowthData]:
        """Calculate channel growth trends from videos"""
        if not videos:
            return []
            
        videos.sort(key=lambda x: x.published_at if x.published_at else datetime.min.replace(tzinfo=timezone.utc))
        
        monthly_data = {}
        for video in videos:
            if video.published_at is None:
                continue
            month_key = video.published_at.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {'views': 0, 'videos': 0}
            monthly_data[month_key]['views'] += video.view_count
            monthly_data[month_key]['videos'] += 1
        
        growth_data_list = []
        cumulative_views = 0
        cumulative_video_count = 0
        
        sorted_month_keys = sorted(monthly_data.keys())

        for month_key in sorted_month_keys:
            data = monthly_data[month_key]
            current_month_views = data['views']
            current_month_videos = data['videos']

            cumulative_views += current_month_views
            cumulative_video_count += current_month_videos
            
            growth_data_list.append(GrowthData(
                date=datetime.strptime(month_key, '%Y-%m').date(),
                cumulative_views=cumulative_views,
                video_count=cumulative_video_count,
                monthly_views=current_month_views
            ))
            
        return growth_data_list
    
    @staticmethod
    def analyze_upload_frequency(videos: List[VideoData]) -> UploadFrequencyData:
        """Analyze upload patterns by day and hour and calculate average frequency"""
        valid_videos = [v for v in videos if v.published_at is not None]

        if not valid_videos:
            return UploadFrequencyData(None, None, None, [], {})
            
        df = pd.DataFrame([{
            'day_of_week': v.published_at.weekday(),
            'hour': v.published_at.hour,
            'timestamp': v.published_at
        } for v in valid_videos])

        if df.empty:
            return UploadFrequencyData(None, None, None, [], {})

        heatmap_data = []
        for day in range(7):
            for hour in range(24):
                count = len(df[(df['day_of_week'] == day) & (df['hour'] == hour)])
                heatmap_data.append({
                    'day': day,
                    'hour': hour,
                    'count': count
                })
        
        df = df.sort_values(by='timestamp')
        date_series = df['timestamp'].dt.floor('D').drop_duplicates()
        
        time_differences_days = []
        if len(date_series) > 1:
            for i in range(1, len(date_series)):
                delta = date_series.iloc[i] - date_series.iloc[i-1]
                time_differences_days.append(delta.days)

        average_days = None
        if time_differences_days:
            average_days = sum(time_differences_days) / len(time_differences_days)
        
        last_upload_date_dt_aware = df['timestamp'].max()
        last_upload_date = last_upload_date_dt_aware.date()

        next_expected_upload_date = None
        if average_days is not None:
            next_expected_upload_date_dt_aware = last_upload_date_dt_aware+ timedelta(days=average_days)
            next_expected_upload_date = next_expected_upload_date_dt_aware.date()

        stats = {
            'most_active_day': int(df['day_of_week'].mode().iloc[0]) if not df.empty else None,
            'most_active_hour': int(df['hour'].mode().iloc[0]) if not df.empty else None,
            'avg_uploads_per_week': round(len(valid_videos) / ((df['timestamp'].max() - df['timestamp'].min()).total_seconds() / (7 * 24 * 3600)) if len(valid_videos) > 0 and (df['timestamp'].max() - df['timestamp'].min()).total_seconds() > 0 else 0, 2)
        }
        
        return UploadFrequencyData(
            average_days_between_uploads=round(average_days, 2) if average_days else None,
            last_upload_date=last_upload_date,
            next_expected_upload_date=next_expected_upload_date,
            heatmap_data=heatmap_data,
            stats=stats
        )
    
    @staticmethod
    def extract_top_keywords(videos: List[VideoData], channel_description: str, num_keywords: int = 20) -> List[KeywordData]:
        """Extract top keywords from video tags, titles, and channel description."""
        if not videos and not channel_description:
            return []
            
        stop_words = set([
            "a", "an", "the", "and", "or", "but", "for", "nor", "on", "at", "by", "from",
            "in", "into", "with", "as", "of", "to", "is", "are", "was", "were", "be",
            "been", "being", "have", "has", "had", "do", "does", "did", "not", "no",
            "yes", "it", "its", "me", "my", "you", "your", "he", "she", "his", "her",
            "we", "our", "they", "their", "this", "that", "these", "those", "can",
            "will", "would", "should", "could", "get", "go", "just", "like", "make",
            "see", "know", "time", "up", "down", "out", "about", "what", "where", "when",
            "why", "how", "from", "into", "through", "during", "before", "after", "above",
            "below", "to", "from", "up", "down", "in", "out", "on", "off", "over",
            "under", "again", "further", "then", "once", "here", "there", "when", "where",
            "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
            "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
            "too", "very", "s", "t", "can", "will", "just", "don", "should", "now",
            "i", "m", "re", "ve", "d", "ll", "youtu", "be", "com", "www"
        ])
        
        all_text = []
        for video in videos:
            all_text.append(video.title)
            all_text.append(video.description)
            all_text.extend(video.tags)
        
        all_text.append(channel_description)

        combined_text = " ".join(all_text).lower()
        words = re.findall(r'\b\w+\b', combined_text)
        
        filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        word_counts = Counter(filtered_words)
        
        total_unique_videos = len(videos)
        
        keywords_list = []
        for keyword, count in word_counts.most_common(num_keywords):
            videos_containing_keyword = sum(
                1 for video in videos 
                if keyword in video.title.lower() or 
                   keyword in video.description.lower() or 
                   any(keyword == tag.lower() for tag in video.tags)
            )
            percentage = (videos_containing_keyword / total_unique_videos * 100) if total_unique_videos > 0 else 0
            
            keywords_list.append(KeywordData(
                keyword=keyword,
                count=count,
                type="general",
                percentage=round(percentage, 2)
            ))
            
        return keywords_list