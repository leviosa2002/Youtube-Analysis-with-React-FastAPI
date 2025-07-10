"""
Trending analysis API routes
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Optional, List
import os
from collections import Counter

from app.services.youtube_service import YouTubeService
from app.services.export_service import ExportService
from app.models.response_models import TrendingAnalysis, ErrorResponse
from app.utils.validators import RequestValidators, YouTubeCategoryValidator
from app.utils.session_storage import session_storage
from app.utils.data_processor import DataProcessor

# IMPORTANT: Import the dependency functions from app.dependencies
from app.dependencies import (
    get_youtube_service,
    get_sentiment_service,
    get_toxicity_service,
    get_keyword_service
)

router = APIRouter()

# Dependencies
# def get_youtube_service():
#     return YouTubeService()

def get_export_service():
    return ExportService()

@router.get("/trending", response_model=TrendingAnalysis)
async def get_trending_videos(
    country: str = "US",
    category_id: Optional[str] = None,
    max_results: int = 50,
    session_id: Optional[str] = None,
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Get trending videos from the last 48 hours
    
    - **country**: Country code (2-letter ISO format, e.g., US, GB, CA)
    - **category_id**: YouTube category ID (1-44, optional)
    - **max_results**: Maximum number of videos to fetch (1-50)
    - **session_id**: Optional session ID for data storage
    """
    try:
        # Validate request
        request_data = RequestValidators.TrendingAnalysisRequest(
            country=country,
            category_id=category_id,
            max_results=max_results
        )
        
        # Create session if not provided
        if not session_id:
            session_id = session_storage.create_session()
        
        # Create cache key
        cache_key = f"trending_{request_data.country}_{request_data.category_id or 'all'}_{request_data.max_results}"
        
        # Check if data already exists in session
        cached_data = session_storage.get_data(session_id, cache_key)
        if cached_data:
            return cached_data
        
        # Fetch trending videos
        trending_videos = youtube_service.get_trending_videos(
            country_code=request_data.country,
            category_id=request_data.category_id,
            max_results=request_data.max_results
        )
        #print(trending_videos)
        
        if not trending_videos:
            raise HTTPException(
                status_code=404,
                detail=f"No trending videos found for country {request_data.country}"
            )
        
        # Calculate velocity data (views per hour since publication)
        velocity_data = []
        for video in trending_videos:
            if 'published_at' in video:
                velocity_metrics = DataProcessor.calculate_view_velocity(
                    video['view_count'],
                    video['published_at']
                )
                velocity_data.append({
                    'video_id': video['id'],
                    'title': video['title'][:50] + '...' if len(video['title']) > 50 else video['title'],
                    'views_per_hour': velocity_metrics['views_per_hour'],
                    'views_per_day': velocity_metrics['views_per_day'],
                    'hours_since_publish': velocity_metrics['hours_since_publish'],
                    'total_views': video['view_count']
                })
        
        # Sort by velocity
        velocity_data.sort(key=lambda x: x['views_per_hour'], reverse=True)
        
        # Calculate category distribution
        category_counts = Counter([video.get('category_id', 'Unknown') for video in trending_videos])
        category_distribution = {}
        
        for cat_id, count in category_counts.items():
            category_name = YouTubeCategoryValidator.get_category_name(cat_id) or f"Category {cat_id}"
            category_distribution[category_name] = count
        
        # Format trending videos for response

        #  # --- START CRITICAL ENGAGEMENT RATE FIX & DEBUGGING ---
        # # Safely get the video ID for debugging and data population.
        # # This should be populated as a string from YouTubeService.
        # current_video_id = video.get('id', 'UNKNOWN_VIDEO_ID') 

        # # Get the count values. YouTubeService should have already converted these to INTEGERS.
        # # Using .get(key, 0) is still a good practice here in case a key is completely missing.
        # current_view_count = video.get('view_count', 0)
        # current_like_count = video.get('like_count', 0)
        # current_comment_count = video.get('comment_count', 0)

        formatted_videos = []
        total_views_overall = 0
        total_likes_overall = 0
        total_comments_overall = 0

        formatted_videos = []
        for video in trending_videos:
            current_view_count = video.get('view_count', 0)
            current_like_count = video.get('like_count', 0)
            current_comment_count = video.get('comment_count', 0)
            
            duration_info = DataProcessor.convert_youtube_duration(video.get('duration', ''))
            
            # Calculate engagement metrics *for this specific video*
            engagement_metrics = DataProcessor.calculate_engagement_rate(
                current_view_count,   # <-- Now these are specific to the current 'video' in the loop
                current_like_count,
                current_comment_count
            )
            # print(current_comment_count,current_like_count,current_view_count,engagement_metrics) # You can uncomment this for a quick test if needed
            
            # Accumulate totals for overall analysis (after getting individual counts)
            total_views_overall += current_view_count
            total_likes_overall += current_like_count
            total_comments_overall += current_comment_count
            
            formatted_videos.append({
                'id': video['id'],
                'title': video['title'],
                'channel_title': video['channel_title'],
                'published_at': video['published_at'],
                'view_count': video['view_count'],
                'view_count_formatted': DataProcessor.format_large_number(video['view_count']),
                'like_count': video['like_count'],
                'like_count_formatted': DataProcessor.format_large_number(video['like_count']),
                'comment_count': video['comment_count'],
                'comment_count_formatted': DataProcessor.format_large_number(video['comment_count']),
                'category_id': video.get('category_id', ''),
                'category_name': YouTubeCategoryValidator.get_category_name(video.get('category_id', '')),
                'duration': video.get('duration', ''),
                'duration_formatted': duration_info['formatted'],
                'duration_seconds': duration_info['seconds'],
                'thumbnail_url': video.get('thumbnail_url', ''),
                'engagement_rate': engagement_metrics['total_engagement_rate']
            })

        # print(formatted_videos)
        
        # Build response
        response_data = {
            'videos': formatted_videos,
            'country': request_data.country,
            'category_filter': request_data.category_id,
            'velocity_data': velocity_data[:20],  # Top 20 by velocity
            'category_distribution': category_distribution,
            'total_videos': len(formatted_videos),
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
            detail=f"Error fetching trending videos: {str(e)}"
        )

@router.get("/trending/categories")
async def get_youtube_categories():
    """
    Get all available YouTube video categories
    """
    try:
        categories = YouTubeCategoryValidator.get_all_categories()
        
        # Format categories for frontend
        categories_list = [
            {
                'id': cat_id,
                'name': cat_name
            }
            for cat_id, cat_name in categories.items()
        ]
        
        # Sort by name
        categories_list.sort(key=lambda x: x['name'])
        
        return {
            'categories': categories_list,
            'total_categories': len(categories_list)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching categories: {str(e)}"
        )

@router.get("/trending/countries")
async def get_supported_countries():
    """
    Get list of supported country codes for trending videos
    """
    try:
        # Common country codes supported by YouTube
        supported_countries = [
            {'code': 'US', 'name': 'United States'},
            {'code': 'GB', 'name': 'United Kingdom'},
            {'code': 'CA', 'name': 'Canada'},
            {'code': 'AU', 'name': 'Australia'},
            {'code': 'DE', 'name': 'Germany'},
            {'code': 'FR', 'name': 'France'},
            {'code': 'IT', 'name': 'Italy'},
            {'code': 'ES', 'name': 'Spain'},
            {'code': 'JP', 'name': 'Japan'},
            {'code': 'KR', 'name': 'South Korea'},
            {'code': 'IN', 'name': 'India'},
            {'code': 'BR', 'name': 'Brazil'},
            {'code': 'MX', 'name': 'Mexico'},
            {'code': 'RU', 'name': 'Russia'},
            {'code': 'CN', 'name': 'China'},
            {'code': 'NL', 'name': 'Netherlands'},
            {'code': 'SE', 'name': 'Sweden'},
            {'code': 'NO', 'name': 'Norway'},
            {'code': 'PL', 'name': 'Poland'},
            {'code': 'TR', 'name': 'Turkey'}
        ]
        
        return {
            'countries': supported_countries,
            'total_countries': len(supported_countries),
            'default_country': 'US'
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching countries: {str(e)}"
        )

@router.get("/trending/velocity")
async def get_trending_velocity(
    country: str = "US",
    top_n: int = 20,
    session_id: Optional[str] = None
):
    """
    Get top videos by view velocity (views per hour)
    
    - **country**: Country code
    - **top_n**: Number of top videos to return (1-50)
    - **session_id**: Optional session ID to check for cached data
    """
    try:
        # Validate parameters
        top_n = max(1, min(50, top_n))
        
        # Check if data already exists in session
        if session_id:
            cache_key = f"trending_{country}_all_50"
            cached_data = session_storage.get_data(session_id, cache_key)
            if cached_data and 'velocity_data' in cached_data:
                return {
                    'country': country,
                    'velocity_data': cached_data['velocity_data'][:top_n],
                    'data_source': 'session_cache'
                }
        
        raise HTTPException(
            status_code=404,
            detail="Velocity data not found. Please fetch trending videos first."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching velocity data: {str(e)}"
        )

@router.get("/trending/export")
async def export_trending_analysis(
    country: str,
    category_id: Optional[str] = None,
    max_results: int = 50,
    session_id: str = None,
    background_tasks: BackgroundTasks = None,
    export_service: ExportService = Depends(get_export_service)
):
    """
    Export trending analysis data to CSV
    
    - **country**: Country code
    - **category_id**: Optional category filter
    - **max_results**: Maximum results
    - **session_id**: Session ID containing analysis data
    """
    try:
        # Create cache key
        cache_key = f"trending_{country}_{category_id or 'all'}_{max_results}"
        
        # Get data from session
        analysis_data = session_storage.get_data(session_id, cache_key)
        if not analysis_data:
            raise HTTPException(
                status_code=404,
                detail="Trending analysis data not found in session. Please run analysis first."
            )
        
        # Export to CSV
        filename = export_service.export_trending_analysis(analysis_data)
        filepath = export_service.get_file_path(filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=500,
                detail="Failed to create export file"
            )
        
        # Schedule file cleanup after download
        if background_tasks:
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
            detail=f"Error exporting trending analysis: {str(e)}"
        )

@router.get("/trending/stats")
async def get_trending_stats(
    country: str = "US",
    session_id: Optional[str] = None
):
    """
    Get statistical overview of trending videos
    
    - **country**: Country code
    - **session_id**: Optional session ID to check for cached data
    """
    try:
        # Check if data already exists in session
        if session_id:
            cache_key = f"trending_{country}_all_50"
            cached_data = session_storage.get_data(session_id, cache_key)
            if cached_data and 'videos' in cached_data:
                videos = cached_data['videos']
                
                # Calculate statistics
                view_counts = [video['view_count'] for video in videos]
                like_counts = [video['like_count'] for video in videos]
                comment_counts = [video['comment_count'] for video in videos]
                engagement_rates = [video['engagement_rate'] for video in videos]
                durations = [video['duration_seconds'] for video in videos]
                
                stats = {
                    'total_videos': len(videos),
                    'view_stats': DataProcessor.calculate_percentiles(view_counts),
                    'like_stats': DataProcessor.calculate_percentiles(like_counts),
                    'comment_stats': DataProcessor.calculate_percentiles(comment_counts),
                    'engagement_stats': DataProcessor.calculate_percentiles(engagement_rates),
                    'duration_stats': DataProcessor.calculate_percentiles(durations),
                    'category_distribution': cached_data.get('category_distribution', {}),
                    'country': country
                }
                
                return stats
        
        raise HTTPException(
            status_code=404,
            detail="Trending data not found. Please fetch trending videos first."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating trending stats: {str(e)}"
        )