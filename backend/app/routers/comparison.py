"""
Comparison analysis API routes
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
import os
import statistics
from datetime import datetime, timezone 

from app.dependencies import (
    get_youtube_service,
    get_sentiment_service,
    get_keyword_service,
    get_toxicity_service
)

from app.services.youtube_service import YouTubeService
from app.services.export_service import ExportService
from app.models.response_models import ChannelComparison, VideoComparison, ErrorResponse
from app.utils.validators import RequestValidators
from app.utils.session_storage import session_storage
from app.utils.data_processor import DataProcessor

router = APIRouter()

def get_export_service():
    return ExportService()

@router.post("/compare/channels", response_model=ChannelComparison)
async def compare_channels(
    request: RequestValidators.ChannelComparisonRequest,
    session_id: Optional[str] = None,
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Compare multiple YouTube channels (2-5 channels)
    
    - **channel_ids**: List of 2-5 YouTube channel IDs
    - **session_id**: Optional session ID for data storage
    """
    try:
        # Create session if not provided
        if not session_id:
            session_id = session_storage.create_session()
        
        # Create cache key
        cache_key = f"channel_comparison_{'_'.join(sorted(request.channel_ids))}"
        
        # Check if data already exists in session
        cached_data = session_storage.get_data(session_id, cache_key)
        if cached_data:
            return cached_data
        
        # Fetch channel information for all channels
        channels_data = []
        for channel_id in request.channel_ids:
            channel_info = youtube_service.get_channel_info(channel_id)
            if not channel_info:
                raise HTTPException(
                    status_code=404,
                    detail=f"Channel not found: {channel_id}"
                )
            channels_data.append(channel_info)
        
        # Convert to dict format
        channels_list = []
        for channel in channels_data:
            channels_list.append({
                'id': channel.id,
                'title': channel.title,
                'description': channel.description,
                'custom_url': channel.custom_url,
                'published_at': channel.published_at,
                'country': channel.country,
                'view_count': channel.view_count,
                'subscriber_count': channel.subscriber_count,
                'video_count': channel.video_count,
                'thumbnail_url': channel.thumbnail_url
            })
        
        # Calculate comparison metrics
        comparison_metrics = {
            'subscriber_counts': [ch['subscriber_count'] for ch in channels_list],
            'view_counts': [ch['view_count'] for ch in channels_list],
            'video_counts': [ch['video_count'] for ch in channels_list],
            'avg_views_per_video': [
                ch['view_count'] / max(1, ch['video_count']) for ch in channels_list
            ],
            'channel_age_days': []
        }
        
        # Calculate channel ages
        for channel in channels_list:
            if channel['published_at']:
                # FIX: Make datetime.now() timezone-aware (UTC) for subtraction
                age_days = (datetime.now(timezone.utc) - channel['published_at']).days
                comparison_metrics['channel_age_days'].append(age_days)
            else:
                comparison_metrics['channel_age_days'].append(0)
        
        # Create rankings for each metric
        rankings = {}
        for metric, values in comparison_metrics.items():
            metric_rankings = []
            
            # Create list of (channel_index, value) pairs and sort
            indexed_values = [(i, val) for i, val in enumerate(values)]
            indexed_values.sort(key=lambda x: x[1], reverse=True)
            
            # Create ranking
            for rank, (channel_idx, value) in enumerate(indexed_values, 1):
                channel = channels_list[channel_idx]
                metric_rankings.append({
                    'rank': rank,
                    'id': channel['id'],
                    'name': channel['title'],
                    'value': value,
                    'formatted_value': DataProcessor.format_large_number(value) if isinstance(value, (int, float)) else str(value)
                })
            
            rankings[metric] = metric_rankings
        
        # Generate insights
        insights = ComparisonAnalyzer.generate_channel_insights(channels_list, comparison_metrics, rankings)
        
        # Build response
        response_data = {
            'channels': channels_list,
            'comparison_metrics': comparison_metrics,
            'rankings': rankings,
            'insights': insights,
            'session_id': session_id
        }
        
        # Store in session
        session_storage.store_data(session_id, cache_key, response_data)
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing channels: {str(e)}"
        )

@router.post("/compare/videos", response_model=VideoComparison)
async def compare_videos(
    request: RequestValidators.VideoComparisonRequest,
    session_id: Optional[str] = None,
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Compare multiple YouTube videos (2-5 videos)
    
    - **video_ids**: List of 2-5 YouTube video IDs
    - **session_id**: Optional session ID for data storage
    """
    try:
        # Create session if not provided
        if not session_id:
            session_id = session_storage.create_session()
        
        # Create cache key
        cache_key = f"video_comparison_{'_'.join(sorted(request.video_ids))}"
        
        # Check if data already exists in session
        cached_data = session_storage.get_data(session_id, cache_key)
        if cached_data:
            return cached_data
        
        # Fetch video information for all videos
        videos_data = []
        for video_id in request.video_ids:
            video_info = youtube_service.get_video_info(video_id)
            if not video_info:
                raise HTTPException(
                    status_code=404,
                    detail=f"Video not found: {video_id}"
                )
            videos_data.append(video_info)
        
        # Calculate comparison metrics
        comparison_metrics = {
            'view_counts': [video['view_count'] for video in videos_data],
            'like_counts': [video['like_count'] for video in videos_data],
            'comment_counts': [video['comment_count'] for video in videos_data],
            'engagement_rates': [],
            'duration_seconds': [],
            'age_hours': []
        }
        
        # Calculate derived metrics
        for video in videos_data:
            # Engagement rate
            engagement_metrics = DataProcessor.calculate_engagement_rate(
                video['view_count'], video['like_count'], video['comment_count']
            )
            comparison_metrics['engagement_rates'].append(engagement_metrics['total_engagement_rate'])
            
            # Duration
            duration_info = DataProcessor.convert_youtube_duration(video['duration'])
            comparison_metrics['duration_seconds'].append(duration_info['seconds'])
            
            # Age in hours
            if video['published_at']:
                # FIX: Make datetime.now() timezone-aware (UTC) for subtraction
                age_hours = (datetime.now(timezone.utc) - video['published_at']).total_seconds() / 3600
                comparison_metrics['age_hours'].append(age_hours)
            else:
                comparison_metrics['age_hours'].append(0)
        
        # Create engagement comparison breakdown
        engagement_comparison = {
            'like_rates': [],
            'comment_rates': [],
            'views_per_hour': []
        }
        
        for i, video in enumerate(videos_data):
            engagement_metrics = DataProcessor.calculate_engagement_rate(
                video['view_count'], video['like_count'], video['comment_count']
            )
            engagement_comparison['like_rates'].append(engagement_metrics['like_rate'])
            engagement_comparison['comment_rates'].append(engagement_metrics['comment_rate'])
            
            # Views per hour
            age_hours = comparison_metrics['age_hours'][i]
            views_per_hour = video['view_count'] / max(1, age_hours)
            engagement_comparison['views_per_hour'].append(views_per_hour)
        
        # Generate insights
        insights = ComparisonAnalyzer.generate_video_insights(videos_data, comparison_metrics, engagement_comparison)
        
        # Build response
        response_data = {
            'videos': videos_data,
            'comparison_metrics': comparison_metrics,
            'engagement_comparison': engagement_comparison,
            'insights': insights,
            'session_id': session_id
        }
        
        # Store in session
        session_storage.store_data(session_id, cache_key, response_data)
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing videos: {str(e)}"
        )

@router.get("/compare/channels/export")
async def export_channel_comparison(
    channel_ids: str,  # Comma-separated channel IDs
    session_id: str,
    background_tasks: BackgroundTasks,
    export_service: ExportService = Depends(get_export_service)
):
    """
    Export channel comparison data to CSV
    
    - **channel_ids**: Comma-separated list of channel IDs
    - **session_id**: Session ID containing comparison data
    """
    try:
        # Parse channel IDs
        channel_id_list = [cid.strip() for cid in channel_ids.split(',')]
        cache_key = f"channel_comparison_{'_'.join(sorted(channel_id_list))}"
        
        # Get data from session
        comparison_data = session_storage.get_data(session_id, cache_key)
        if not comparison_data:
            raise HTTPException(
                status_code=404,
                detail="Channel comparison data not found in session. Please run comparison first."
            )
        
        # Export to CSV
        filename = export_service.export_comparison_analysis(comparison_data, 'channel')
        filepath = export_service.get_file_path(filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=500,
                detail="Failed to create export file"
            )
        
        # Schedule file cleanup after download
        background_tasks.add_task(export_service.cleanup_file, filename)
        
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type='text/csv',
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting channel comparison: {str(e)}"
        )

@router.get("/compare/videos/export")
async def export_video_comparison(
    video_ids: str,  # Comma-separated video IDs
    session_id: str,
    background_tasks: BackgroundTasks,
    export_service: ExportService = Depends(get_export_service)
):
    """
    Export video comparison data to CSV
    
    - **video_ids**: Comma-separated list of video IDs
    - **session_id**: Session ID containing comparison data
    """
    try:
        # Parse video IDs
        video_id_list = [vid.strip() for vid in video_ids.split(',')]
        cache_key = f"video_comparison_{'_'.join(sorted(video_id_list))}"
        
        # Get data from session
        comparison_data = session_storage.get_data(session_id, cache_key)
        if not comparison_data:
            raise HTTPException(
                status_code=404,
                detail="Video comparison data not found in session. Please run comparison first."
            )
        
        # Export to CSV
        filename = export_service.export_comparison_analysis(comparison_data, 'video')
        filepath = export_service.get_file_path(filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=500,
                detail="Failed to create export file"
            )
        
        # Schedule file cleanup after download
        background_tasks.add_task(export_service.cleanup_file, filename)
        
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type='text/csv',
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting video comparison: {str(e)}"
        )

class ComparisonAnalyzer:
    """Helper class for generating comparison insights"""
    
    @staticmethod
    def generate_channel_insights(channels: List[Dict], metrics: Dict, rankings: Dict) -> List[str]:
        """Generate insights for channel comparison"""
        insights = []
        
        try:
            # Top performer by subscribers
            top_subs = rankings['subscriber_counts'][0]
            insights.append(f"{top_subs['name']} leads with {top_subs['formatted_value']} subscribers")
            
            # Top performer by total views
            top_views = rankings['view_counts'][0]
            if top_views['id'] != top_subs['id']:
                insights.append(f"{top_views['name']} has the most total views with {top_views['formatted_value']}")
            
            # Most efficient channel (highest avg views per video)
            top_efficiency = rankings['avg_views_per_video'][0]
            insights.append(f"{top_efficiency['name']} has the highest average views per video ({top_efficiency['formatted_value']})")
            
            # Channel age insights
            if 'channel_age_days' in metrics:
                ages = metrics['channel_age_days']
                # Ensure there are at least two channels to compare for min/max age
                if len(ages) > 1:
                    oldest_idx = ages.index(max(ages))
                    newest_idx = ages.index(min(ages))
                    
                    oldest_channel = channels[oldest_idx]
                    newest_channel = channels[newest_idx]
                    
                    if oldest_channel['id'] != newest_channel['id']:
                        insights.append(f"{oldest_channel['title']} is the oldest channel ({max(ages)//365} years old)")
                        insights.append(f"{newest_channel['title']} is the newest channel ({min(ages)//365} years old)")
                elif len(ages) == 1: # Only one channel, can still report its age
                    insights.append(f"{channels[0]['title']} is {ages[0]//365} years old.")


            # Subscriber growth efficiency
            if len(channels) >= 2:
                growth_rates = []
                for i, channel in enumerate(channels):
                    age_days = metrics['channel_age_days'][i]
                    if age_days > 0:
                        daily_sub_growth = channel['subscriber_count'] / age_days
                        growth_rates.append((channel['title'], daily_sub_growth))
                
                if growth_rates:
                    growth_rates.sort(key=lambda x: x[1], reverse=True)
                    fastest_growing = growth_rates[0]
                    insights.append(f"{fastest_growing[0]} has the fastest subscriber growth rate")
            
        except Exception as e:
            insights.append(f"Unable to generate detailed channel insights due to data limitations or error: {e}") # Added error for debugging
        
        return insights[:5]  # Limit to 5 insights
    
    @staticmethod
    def generate_video_insights(videos: List[Dict], metrics: Dict, engagement: Dict) -> List[str]:
        """Generate insights for video comparison"""
        insights = []
        
        try:
            # Most viewed video
            view_counts = metrics['view_counts']
            max_views_idx = view_counts.index(max(view_counts))
            top_video = videos[max_views_idx]
            insights.append(f"'{top_video['title'][:50]}...' has the most views ({DataProcessor.format_large_number(max(view_counts))})")
            
            # Highest engagement rate
            engagement_rates = metrics['engagement_rates']
            max_engagement_idx = engagement_rates.index(max(engagement_rates))
            top_engagement_video = videos[max_engagement_idx]
            if max_engagement_idx != max_views_idx:
                insights.append(f"'{top_engagement_video['title'][:50]}...' has the highest engagement rate ({max(engagement_rates):.2f}%)")
            
            # Fastest growing (views per hour)
            views_per_hour = engagement['views_per_hour']
            max_velocity_idx = views_per_hour.index(max(views_per_hour))
            fastest_video = videos[max_velocity_idx]
            insights.append(f"'{fastest_video['title'][:50]}...' has the highest view velocity ({DataProcessor.format_large_number(max(views_per_hour))} views/hour)")
            
            # Duration insights
            durations = metrics['duration_seconds']
            longest_idx = durations.index(max(durations))
            shortest_idx = durations.index(min(durations))
            
            if longest_idx != shortest_idx:
                longest_video = videos[longest_idx]
                shortest_video = videos[shortest_idx]
                
                longest_duration = DataProcessor.convert_youtube_duration(longest_video['duration'])
                shortest_duration = DataProcessor.convert_youtube_duration(shortest_video['duration'])
                
                insights.append(f"Duration varies from {shortest_duration['formatted']} to {longest_duration['formatted']}")
            
            # Like-to-view ratio insight
            like_rates = engagement['like_rates']
            max_like_rate_idx = like_rates.index(max(like_rates))
            best_liked_video = videos[max_like_rate_idx]
            insights.append(f"'{best_liked_video['title'][:50]}...' has the best like-to-view ratio ({max(like_rates):.3f}%)")
            
        except Exception as e:
            insights.append(f"Unable to generate detailed video insights due to data limitations or error: {e}") # Added error for debugging
        
        return insights[:5]  # Limit to 5 insights