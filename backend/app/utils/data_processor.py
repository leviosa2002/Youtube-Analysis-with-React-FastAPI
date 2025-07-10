"""
Data processing utilities for YouTube analytics
"""
import re
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
import numpy as np
from dateutil.parser import parse as parse_date

class DataProcessor:
    """Utility class for processing YouTube API data"""
    
    @staticmethod
    def convert_youtube_duration(duration: str) -> Dict[str, Any]:
        """Convert YouTube ISO 8601 duration to readable format and seconds"""
        if not duration:
            return {'seconds': 0, 'formatted': '0:00', 'readable': '0 seconds'}
        
        # Parse ISO 8601 duration (PT#H#M#S)
        pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration)
        
        if not match:
            return {'seconds': 0, 'formatted': '0:00', 'readable': '0 seconds'}
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        total_seconds = hours * 3600 + minutes * 60 + seconds
        
        # Format as HH:MM:SS or MM:SS
        if hours > 0:
            formatted = f"{hours}:{minutes:02d}:{seconds:02d}"
            readable = f"{hours}h {minutes}m {seconds}s"
        else:
            formatted = f"{minutes}:{seconds:02d}"
            readable = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
        
        return {
            'seconds': total_seconds,
            'formatted': formatted,
            'readable': readable,
            'hours': hours,
            'minutes': minutes
        }
    
    @staticmethod
    def format_large_number(number: Union[int, float]) -> str:
        """Format large numbers with K, M, B suffixes"""
        if not isinstance(number, (int, float)):
            return str(number)
        
        if number >= 1_000_000_000:
            return f"{number / 1_000_000_000:.1f}B"
        elif number >= 1_000_000:
            return f"{number / 1_000_000:.1f}M"
        elif number >= 1_000:
            return f"{number / 1_000:.1f}K"
        else:
            return str(int(number))
    
    @staticmethod
    def calculate_engagement_rate(views: int, likes: int, comments: int, 
                                shares: int = 0) -> Dict[str, float]:
        """Calculate various engagement metrics"""
        if views == 0:
            return {
                'total_engagement_rate': 0.0,
                'like_rate': 0.0,
                'comment_rate': 0.0,
                'share_rate': 0.0
            }
        
        total_engagements = likes + comments + shares
        
        return {
            'total_engagement_rate': round((total_engagements / views) * 100, 4),
            'like_rate': round((likes / views) * 100, 4),
            'comment_rate': round((comments / views) * 100, 4),
            'share_rate': round((shares / views) * 100, 4)
        }
    
    @staticmethod
    def parse_youtube_date(date_string: str) -> Optional[datetime]:
        """Parse YouTube API date string to datetime object"""
        if not date_string:
            return None
        
        try:
            # YouTube API returns ISO format with Z timezone
            return parse_date(date_string.replace('Z', '+00:00'))
        except Exception as e:
            print(f"Error parsing date {date_string}: {e}")
            return None
    
    @staticmethod
    def calculate_view_velocity(views: int, published_date: datetime) -> Dict[str, float]:
        """Calculate view velocity metrics"""
        if not published_date:
            return {'views_per_hour': 0.0, 'views_per_day': 0.0}
        
        now = datetime.now(published_date.tzinfo)
        time_diff = now - published_date
        hours_since_publish = max(1, time_diff.total_seconds() / 3600)
        
        views_per_hour = views / hours_since_publish
        views_per_day = views_per_hour * 24
        
        return {
            'views_per_hour': round(views_per_hour, 2),
            'views_per_day': round(views_per_day, 2),
            'hours_since_publish': round(hours_since_publish, 2)
        }
    
    @staticmethod
    def categorize_video_length(duration_seconds: int) -> str:
        """Categorize video by length"""
        if duration_seconds < 60:
            return 'Short (< 1 min)'
        elif duration_seconds < 300:  # 5 minutes
            return 'Brief (1-5 min)'
        elif duration_seconds < 900:  # 15 minutes
            return 'Medium (5-15 min)'
        elif duration_seconds < 1800:  # 30 minutes
            return 'Long (15-30 min)'
        else:
            return 'Extended (30+ min)'
    
    @staticmethod
    def extract_hashtags(text: str) -> List[str]:
        """Extract hashtags from text"""
        if not text:
            return []
        
        hashtag_pattern = r'#\w+'
        hashtags = re.findall(hashtag_pattern, text, re.IGNORECASE)
        return [tag.lower() for tag in hashtags]
    
    @staticmethod
    def clean_text_for_analysis(text: str) -> str:
        """Clean text for analysis (remove URLs, special chars, etc.)"""
        if not text:
            return ""
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove excessive punctuation
        text = re.sub(r'[!]{2,}', '!', text)
        text = re.sub(r'[?]{2,}', '?', text)
        
        return text.strip()
    
    @staticmethod
    def calculate_growth_rate(current_value: float, previous_value: float) -> Dict[str, Any]:
        """Calculate growth rate and related metrics"""
        if previous_value == 0:
            if current_value > 0:
                return {
                    'growth_rate': float('inf'),
                    'growth_percentage': float('inf'),
                    'growth_description': 'New/Infinite Growth'
                }
            else:
                return {
                    'growth_rate': 0,
                    'growth_percentage': 0,
                    'growth_description': 'No Change'
                }
        
        growth_rate = (current_value - previous_value) / previous_value
        growth_percentage = growth_rate * 100
        
        if growth_percentage > 100:
            description = 'Explosive Growth'
        elif growth_percentage > 50:
            description = 'Very High Growth'
        elif growth_percentage > 20:
            description = 'High Growth'
        elif growth_percentage > 5:
            description = 'Moderate Growth'
        elif growth_percentage > 0:
            description = 'Slow Growth'
        elif growth_percentage == 0:
            description = 'No Change'
        elif growth_percentage > -5:
            description = 'Slight Decline'
        elif growth_percentage > -20:
            description = 'Moderate Decline'
        else:
            description = 'Significant Decline'
        
        return {
            'growth_rate': round(growth_rate, 4),
            'growth_percentage': round(growth_percentage, 2),
            'growth_description': description
        }
    
    @staticmethod
    def normalize_scores(scores: List[float], min_val: float = 0, max_val: float = 100) -> List[float]:
        """Normalize scores to a specific range"""
        if not scores:
            return []
        
        scores_array = np.array(scores)
        min_score = np.min(scores_array)
        max_score = np.max(scores_array)
        
        if max_score == min_score:
            return [min_val] * len(scores)
        
        normalized = ((scores_array - min_score) / (max_score - min_score)) * (max_val - min_val) + min_val
        return normalized.tolist()
    
    @staticmethod
    def calculate_percentiles(values: List[float]) -> Dict[str, float]:
        """Calculate percentile statistics"""
        if not values:
            return {}
        
        values_array = np.array(values)
        
        return {
            'min': float(np.min(values_array)),
            'max': float(np.max(values_array)),
            'mean': float(np.mean(values_array)),
            'median': float(np.median(values_array)),
            'p25': float(np.percentile(values_array, 25)),
            'p75': float(np.percentile(values_array, 75)),
            'std': float(np.std(values_array))
        }
    
    @staticmethod
    def create_time_series_data(data_points: List[Dict[str, Any]], 
                              date_key: str, value_key: str) -> List[Dict[str, Any]]:
        """Create time series data for visualization"""
        if not data_points:
            return []
        
        # Sort by date
        sorted_data = sorted(data_points, key=lambda x: x.get(date_key, datetime.min))
        
        time_series = []
        for point in sorted_data:
            date_value = point.get(date_key)
            if isinstance(date_value, str):
                date_value = DataProcessor.parse_youtube_date(date_value)
            
            if date_value:
                time_series.append({
                    'timestamp': int(date_value.timestamp()),
                    'date': date_value.strftime('%Y-%m-%d'),
                    'value': point.get(value_key, 0)
                })
        
        return time_series
    
    @staticmethod
    def aggregate_by_time_period(data: List[Dict[str, Any]], 
                               date_key: str, value_key: str,
                               period: str = 'day') -> List[Dict[str, Any]]:
        """Aggregate data by time period (day, week, month)"""
        if not data:
            return []
        
        df = pd.DataFrame(data)
        if date_key not in df.columns or value_key not in df.columns:
            return []
        
        # Convert date column
        df[date_key] = pd.to_datetime(df[date_key])
        
        # Set period frequency
        freq_map = {
            'hour': 'H',
            'day': 'D',
            'week': 'W',
            'month': 'M'
        }
        freq = freq_map.get(period, 'D')
        
        # Group and aggregate
        df.set_index(date_key, inplace=True)
        aggregated = df.groupby(pd.Grouper(freq=freq))[value_key].sum().reset_index()
        
        # Convert back to list of dicts
        result = []
        for _, row in aggregated.iterrows():
            result.append({
                'date': row[date_key].strftime('%Y-%m-%d'),
                'value': float(row[value_key]),
                'period': period
            })
        
        return result
    
    @staticmethod
    def validate_youtube_id(youtube_id: str, id_type: str = 'video') -> bool:
        """Validate YouTube video or channel ID format"""
        if not youtube_id:
            return False
        
        if id_type == 'video':
            # YouTube video IDs are 11 characters long, alphanumeric + - and _
            pattern = r'^[a-zA-Z0-9_-]{11}$'
        elif id_type == 'channel':
            # Channel IDs start with UC and are 24 characters long, or custom URLs
            pattern = r'^(UC[a-zA-Z0-9_-]{22}|[a-zA-Z0-9_-]+)$'
        else:
            return False
        
        return bool(re.match(pattern, youtube_id))