"""
Channel analysis API routes
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import FileResponse
from typing import Optional, Dict, Any
from app.services.youtube_service import YouTubeService 
from app.utils.validators import RequestValidators
from dataclasses import asdict
import os
import logging

from app.services.keyword_service import KeywordService
from app.services.export_service import ExportService
from app.models.channel import ChannelProcessor, VideoData, KeywordData
from app.models.response_models import ChannelAnalytics
from app.utils.data_processor import DataProcessor
from app.utils.session_storage import session_storage

from app.dependencies import (
    get_youtube_service,
    get_sentiment_service,
    get_keyword_service,
    get_toxicity_service
)

router = APIRouter()
logger = logging.getLogger(__name__)

def get_export_service():
    return ExportService()

@router.get("/channel/{channel_id}", response_model=ChannelAnalytics)
async def analyze_channel(
    channel_id: str,
    include_videos: bool = True,
    max_videos: int = 50,
    include_keywords: bool = True,
    session_id: Optional[str] = None,
    youtube_service: YouTubeService = Depends(get_youtube_service),
    keyword_service: KeywordService = Depends(get_keyword_service)
):
    """
    Analyze a YouTube channel

    - **channel_id**: YouTube channel ID or custom URL
    - **include_videos**: Whether to fetch and analyze recent videos
    - **max_videos**: Maximum number of recent videos to analyze (1-50)
    - **include_keywords**: Whether to extract keywords from video content
    - **session_id**: Optional session ID for data storage
    """
    try:
        # Validate request
        request_data = RequestValidators.ChannelAnalysisRequest(
            channel_id=channel_id,
            include_videos=include_videos,
            max_videos=max_videos,
            include_keywords=include_keywords
        )

        # Create session if not provided
        if not session_id:
            session_id = session_storage.create_session()

        # Check if data already exists in session
        cached_data = session_storage.get_data(session_id, f"channel_analysis_{channel_id}")
        if cached_data:
            return cached_data

        # Fetch channel information
        channel_info = youtube_service.get_channel_info(request_data.channel_id)
        if not channel_info:
            raise HTTPException(
                status_code=404,
                detail=f"Channel not found: {channel_id}"
            )

        channel_info_dict = {
            'id': channel_info.id,
            'title': channel_info.title,
            'description': channel_info.description,
            'custom_url': channel_info.custom_url,
            'published_at': channel_info.published_at,
            'country': channel_info.country,
            'view_count': channel_info.view_count,
            'subscriber_count': channel_info.subscriber_count,
            'video_count': channel_info.video_count,
            'thumbnail_url': channel_info.thumbnail_url
        }

        response_data: Dict[str, Any] = {
            'channel_info': channel_info_dict,
            'growth_data': [],
            'upload_frequency': {},
            'top_keywords': [],
            'recent_videos': []
        }

        if request_data.include_videos:
            videos = youtube_service.get_channel_videos(
                request_data.channel_id,
                request_data.max_videos
            )

            if videos:
                videos_dict = []
                for video in videos:
                    duration_info = DataProcessor.convert_youtube_duration(video.duration)
                    engagement_metrics = DataProcessor.calculate_engagement_rate(
                        video.view_count, video.like_count, video.comment_count
                    )

                    videos_dict.append({
                        'id': video.id,
                        'title': video.title,
                        'published_at': video.published_at,
                        'view_count': video.view_count,
                        'like_count': video.like_count,
                        'comment_count': video.comment_count,
                        'duration': video.duration,
                        'duration_formatted': duration_info['formatted'],
                        'duration_seconds': duration_info['seconds'],
                        'tags': video.tags,
                        'engagement_rate': engagement_metrics.get('total_engagement_rate', 0.0)
                    })

                response_data['recent_videos'] = videos_dict

                growth_trends_objects = ChannelProcessor.calculate_growth_trends(videos)
                response_data['growth_data'] = [
                    (g.model_dump() if hasattr(g, 'model_dump') else asdict(g))
                    for g in growth_trends_objects
                ]

                upload_frequency_object = ChannelProcessor.analyze_upload_frequency(videos)
                response_data['upload_frequency'] = (
                    upload_frequency_object.model_dump() if hasattr(upload_frequency_object, 'model_dump') else asdict(upload_frequency_object)
                )

                if include_keywords:
                    all_keywords_combined = []

                    youtube_service_keywords = youtube_service.extract_and_rank_keywords(
                        videos,
                        channel_info.description if channel_info.description else ""
                    )
                    channel_processor_keywords = ChannelProcessor.extract_top_keywords(videos, channel_info.description)

                    for k in youtube_service_keywords + channel_processor_keywords:
                        all_keywords_combined.append({
                            'keyword': k.keyword,
                            'count': k.count,
                            'relevance_score': 1.0,
                            'type': k.type
                        })
                    
                    video_titles = [video.title for video in videos]
                    keybert_extracted_keywords = keyword_service.extract_trending_keywords(video_titles)

                    all_keywords_combined.extend(keybert_extracted_keywords)

                    response_data['top_keywords'] = sorted(
                        all_keywords_combined,
                        key=lambda x: (x.get('relevance_score', 0.0), x.get('count', 0)),
                        reverse=True
                    )[:30]

        session_storage.store_data(session_id, f"channel_analysis_{channel_id}", response_data)
        response_data['session_id'] = session_id
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing channel: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing channel: {str(e)}"
        )
    
@router.get("/channel/{channel_id}/export")
async def export_channel_analysis(
    channel_id: str,
    session_id: str,
    background_tasks: BackgroundTasks,
    export_service: ExportService = Depends(get_export_service)
):
    """
    Export channel analysis data to CSV
    
    - **channel_id**: YouTube channel ID
    - **session_id**: Session ID containing analysis data
    """
    try:
        analysis_data = session_storage.get_data(session_id, f"channel_analysis_{channel_id}")
        if not analysis_data:
            raise HTTPException(
                status_code=404,
                detail="Channel analysis data not found in session. Please run analysis first."
            )
        
        filename = export_service.export_channel_analysis(analysis_data)
        filepath = export_service.get_file_path(filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=500,
                detail="Failed to create export file"
            )
        
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
            detail=f"Error exporting channel analysis: {str(e)}"
        )

@router.get("/channel/{channel_id}/videos")
async def get_channel_videos(
    channel_id: str,
    max_results: int = 50,
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Get recent videos from a channel
    
    - **channel_id**: YouTube channel ID or custom URL
    - **max_results**: Maximum number of videos to fetch (1-50)
    """
    try:
        if not DataProcessor.validate_youtube_id(channel_id, 'channel'):
            raise HTTPException(
                status_code=400,
                detail="Invalid channel ID format"
            )
        
        max_results = max(1, min(50, max_results))
        
        videos = youtube_service.get_channel_videos(channel_id, max_results)
        
        if not videos:
            raise HTTPException(
                status_code=404,
                detail="No videos found for this channel or channel does not exist"
            )
        
        videos_response = []
        for video in videos:
            duration_info = DataProcessor.convert_youtube_duration(video.duration)
            engagement_metrics = DataProcessor.calculate_engagement_rate(
                video.view_count, video.like_count, video.comment_count
            )
            
            videos_response.append({
                'id': video.id,
                'title': video.title,
                'published_at': video.published_at.isoformat(),
                'view_count': video.view_count,
                'view_count_formatted': DataProcessor.format_large_number(video.view_count),
                'like_count': video.like_count,
                'like_count_formatted': DataProcessor.format_large_number(video.like_count),
                'comment_count': video.comment_count,
                'comment_count_formatted': DataProcessor.format_large_number(video.comment_count),
                'duration': video.duration,
                'duration_formatted': duration_info['formatted'],
                'duration_seconds': duration_info['seconds'],
                'duration_category': DataProcessor.categorize_video_length(duration_info['seconds']),
                'tags': video.tags,
                'engagement_rate': engagement_metrics['total_engagement_rate']
            })
        
        return {
            'channel_id': channel_id,
            'videos': videos_response,
            'total_videos': len(videos_response),
            'fetched_at': videos[0].published_at.isoformat() if videos and videos[0].published_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching channel videos: {str(e)}"
        )

@router.get("/channel/{channel_id}/growth")
async def get_channel_growth_data(
    channel_id: str,
    session_id: Optional[str] = None
):
    """
    Get channel growth data
    
    - **channel_id**: YouTube channel ID
    - **session_id**: Optional session ID to fetch cached data
    """
    try:
        if session_id:
            cached_data = session_storage.get_data(session_id, f"channel_analysis_{channel_id}")
            if cached_data and 'growth_data' in cached_data:
                return {
                    'channel_id': channel_id,
                    'growth_data': cached_data['growth_data'],
                    'data_source': 'session_cache'
                }
        
        raise HTTPException(
            status_code=404,
            detail="Growth data not found. Please run channel analysis first."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching growth data: {str(e)}"
        )