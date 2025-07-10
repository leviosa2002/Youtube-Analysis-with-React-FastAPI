"""
Video data models and processing classes
"""
from dataclasses import dataclass, field # Ensure 'field' is imported here too
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
import re
from dateutil import parser
import logging

logger = logging.getLogger(__name__)

@dataclass
class CommentData:
    """Individual comment data"""
    id: str
    text: str
    author: str
    published_at: datetime
    like_count: int
    reply_count: int
    
    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> 'CommentData':
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
    """Represents core data for a YouTube video."""
    id: str
    title: str
    description: str
    published_at: datetime
    channel_id: str
    channel_title: str
    duration: str
    view_count: int
    like_count: int
    comment_count: int
    tags: List[str] = field(default_factory=list) # Should already be fixed
    thumbnail_url: Optional[str] = None
    engagement_rate: Optional[float] = None
    comments: List[CommentData] = field(default_factory=list) # Should already be fixed

    @classmethod
    def from_api_response(cls, item: Dict[str, Any]) -> 'VideoData':
        snippet = item.get('snippet', {})
        statistics = item.get('statistics', {})
        content_details = item.get('contentDetails', {})

        published_at_str = snippet.get('publishedAt', '')
        parsed_published_at = None
        if published_at_str:
            try:
                parsed_published_at = parser.parse(published_at_str).astimezone(timezone.utc)
            except ValueError:
                logger.warning(f"Failed to parse published_at for video {item.get('id', 'unknown')}: {published_at_str}")

        return cls(
            id=item.get('id', ''),
            title=snippet.get('title', ''),
            description=snippet.get('description', ''),
            published_at=parsed_published_at,
            channel_id=snippet.get('channelId', ''),
            channel_title=snippet.get('channelTitle', ''),
            duration=content_details.get('duration', ''),
            view_count=int(statistics.get('viewCount', 0)),
            like_count=int(statistics.get('like_count', 0)),
            comment_count=int(statistics.get('commentCount', 0)),
            tags=snippet.get('tags', []),
            thumbnail_url=snippet.get('thumbnails', {}).get('high', {}).get('url', '')
        )

    @property
    def age_in_days(self) -> Optional[int]:
        if self.published_at and isinstance(self.published_at, datetime):
            # This comparison should be safe now that both are timezone-aware
            now_utc = datetime.now(timezone.utc)
            return (now_utc - self.published_at).days
        return None

class VideoProcessor:
    # ... (rest of VideoProcessor methods, no datetime changes needed here)
    @staticmethod
    def parse_duration(duration_str: str) -> timedelta:
        if not duration_str:
            return timedelta(0)
            
        pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration_str)
        
        if not match:
            return timedelta(0)
            
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return timedelta(hours=hours, minutes=minutes, seconds=seconds)
    
    @staticmethod
    def calculate_engagement_metrics(video_data: Dict[str, Any]) -> Dict[str, float]:
        view_count = video_data.get('view_count', 0)
        like_count = video_data.get('like_count', 0)
        comment_count = video_data.get('comment_count', 0)
        
        if view_count == 0:
            return {
                'engagement_rate': 0.0,
                'like_rate': 0.0,
                'comment_rate': 0.0,
                'like_to_view_ratio': 0.0,
                'comment_to_view_ratio': 0.0
            }
        
        engagement_rate = ((like_count + comment_count) / view_count) * 100
        like_rate = (like_count / view_count) * 100
        comment_rate = (comment_count / view_count) * 100
        
        return {
            'engagement_rate': round(engagement_rate, 4),
            'like_rate': round(like_rate, 4),
            'comment_rate': round(comment_rate, 4),
            'like_to_view_ratio': round(like_count / view_count, 6),
            'comment_to_view_ratio': round(comment_count / view_count, 6)
        }
    
    @staticmethod
    def analyze_performance_insights(video_data: Dict[str, Any]) -> Dict[str, Any]:
        view_count = video_data.get('view_count', 0)
        like_count = video_data.get('like_count', 0)
        comment_count = video_data.get('comment_count', 0)
        duration = video_data.get('duration', '')
        
        duration_delta = VideoProcessor.parse_duration(duration)
        duration_minutes = duration_delta.total_seconds() / 60
        
        insights = {
            'performance_score': 0,
            'category': 'Unknown',
            'recommendations': [],
            'duration_category': VideoProcessor._categorize_duration(duration_minutes),
            'engagement_level': VideoProcessor._categorize_engagement(view_count, like_count, comment_count)
        }
        
        engagement_rate = ((like_count + comment_count) / max(view_count, 1)) * 100
        
        if engagement_rate >= 5:
            insights['performance_score'] = 90 + min(10, engagement_rate - 5)
            insights['category'] = 'Excellent'
        elif engagement_rate >= 2:
            insights['performance_score'] = 70 + (engagement_rate - 2) * 6.67
            insights['category'] = 'Good'
        elif engagement_rate >= 1:
            insights['performance_score'] = 50 + (engagement_rate - 1) * 20
            insights['category'] = 'Average'
        else:
            insights['performance_score'] = engagement_rate * 50
            insights['category'] = 'Poor'
        
        insights['recommendations'] = VideoProcessor._generate_recommendations(
            engagement_rate, duration_minutes, view_count, like_count, comment_count
        )
        
        return insights
    
    @staticmethod
    def _categorize_duration(minutes: float) -> str:
        if minutes < 1:
            return 'Short (< 1 min)'
        elif minutes < 5:
            return 'Brief (1-5 min)'
        elif minutes < 15:
            return 'Medium (5-15 min)'
        elif minutes < 30:
            return 'Long (15-30 min)'
        else:
            return 'Extended (30+ min)'
    
    @staticmethod
    def _categorize_engagement(views: int, likes: int, comments: int) -> str:
        if views == 0:
            return 'No Data'
            
        engagement_rate = ((likes + comments) / views) * 100
        
        if engagement_rate >= 5:
            return 'Very High'
        elif engagement_rate >= 2:
            return 'High'
        elif engagement_rate >= 1:
            return 'Moderate'
        elif engagement_rate >= 0.5:
            return 'Low'
        else:
            return 'Very Low'
    
    @staticmethod
    def _generate_recommendations(engagement_rate: float, duration: float, 
                                 views: int, likes: int, comments: int) -> List[str]:
        recommendations = []
        
        if engagement_rate < 1:
            recommendations.append("Consider improving thumbnail and title to increase click-through rate")
            
        if engagement_rate < 2:
            recommendations.append("Add more call-to-actions to encourage likes and comments")
            
        if comments < views * 0.01:
            recommendations.append("Ask engaging questions to encourage viewer comments")
            
        if duration > 20 and engagement_rate < 3:
            recommendations.append("Consider shorter content format for better retention")
            
        if duration < 2 and views > 1000:
            recommendations.append("Longer content might provide more value and retention")
            
        if likes < views * 0.02:
            recommendations.append("Remind viewers to like the video if they found it helpful")
            
        if not recommendations:
            recommendations.append("Great performance! Keep up the good work")
            
        return recommendations