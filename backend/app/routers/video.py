"""
Video analysis API routes
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Optional, List
import os
import logging

# IMPORT ALL DEPENDENCY FUNCTIONS FROM app.main
from app.dependencies import (
    get_youtube_service,
    get_sentiment_service,
    get_keyword_service,
    get_toxicity_service
)
from app.services.youtube_service import YouTubeService
from app.services.sentiment_service import SentimentService
from app.services.keyword_service import KeywordService
from app.services.toxicity_service import ToxicityService
from app.services.export_service import ExportService
from app.models.video import VideoProcessor, CommentData # Import CommentData
from app.models.response_models import VideoAnalytics, ErrorResponse
from app.utils.validators import RequestValidators
from app.utils.session_storage import session_storage
from app.utils.data_processor import DataProcessor

router = APIRouter()

# --- Dependencies defined *only* if they are unique to this router ---
def get_export_service() -> ExportService:
    """Provides an ExportService instance."""
    return ExportService()

# Initialize logger for this router
logger = logging.getLogger(__name__)


@router.get("/video/{video_id}", response_model=VideoAnalytics)
async def analyze_video(
    video_id: str,
    include_comments: bool = True,
    max_comments: int = 500,
    include_sentiment: bool = True,
    include_keywords: bool = True,
    include_toxicity: bool = True,
    session_id: Optional[str] = None,
    # Dependencies are now correctly typed and imported from app.dependencies
    youtube_service: YouTubeService = Depends(get_youtube_service),
    sentiment_service: SentimentService = Depends(get_sentiment_service),
    keyword_service: KeywordService = Depends(get_keyword_service),
    toxicity_service: ToxicityService = Depends(get_toxicity_service)
):
    logger.info(f"Backend: Received request for video ID: {video_id} in /api/video/{video_id} endpoint")
    logger.info(f"[{video_id}] Received analysis request.")

    try:
        logger.info(f"[{video_id}] Starting request validation.")
        # Validate request
        request_data = RequestValidators.VideoAnalysisRequest(
            video_id=video_id,
            include_comments=include_comments,
            max_comments=max_comments,
            include_sentiment=include_sentiment,
            include_keywords=include_keywords,
            include_toxicity=include_toxicity
        )
        logger.info(f"[{video_id}] Request validated successfully.")
        logger.info(f"[{video_id}] DEBUG: Running the LATEST video analysis code version.") # Keep this debug line

        # Create session if not provided
        if not session_id:
            logger.info(f"[{video_id}] Session ID not provided, creating new session.")
            session_id = session_storage.create_session()
            logger.info(f"[{video_id}] New session created: {session_id}")

        logging.info(f"[{video_id}] Checking for cached data with session ID: {session_id}")
        # Check if data already exists in session
        cached_data = session_storage.get_data(session_id, f"video_analysis_{video_id}")
        if cached_data:
            logging.info(f"[{video_id}] Cached data found, returning from cache.")
            return cached_data
        logging.info(f"[{video_id}] No cached data found.")

        logging.info(f"[{video_id}] Fetching video information from YouTube API.")
        # Fetch video information
        video_info = youtube_service.get_video_info(request_data.video_id)
        if not video_info:
            logging.warning(f"[{video_id}] Video not found or unavailable via YouTube API.")
            raise HTTPException(
                status_code=404,
                detail=f"Video not found: {video_id}"
            )
        logging.info(f"[{video_id}] Video information fetched successfully: {video_info.get('title', 'N/A')}")

        logging.info(f"[{video_id}] Calculating engagement metrics.")
        # Calculate engagement metrics
        engagement_metrics = VideoProcessor.calculate_engagement_metrics(video_info)
        logging.info(f"[{video_id}] Engagement metrics calculated.")

        logging.info(f"[{video_id}] Analyzing performance insights.")
        # Analyze performance insights
        performance_insights = VideoProcessor.analyze_performance_insights(video_info)
        logging.info(f"[{video_id}] Performance insights analyzed.")

        # Initialize comment analysis structure
        comment_analysis = {
            'total_comments': video_info.get('comment_count', 0),
            'analyzed_comments': 0,
            'sentiment_scores': {},
            'sentiment_distribution': {},
            'keywords': [],
            'toxicity_analysis': {},
            'sentiment_analysis': {} # This is the NEW key to hold the detailed sentiment results
        }
        logging.info(f"[{video_id}] Initialized comment analysis structure. Total comments reported by YouTube: {video_info.get('comment_count', 0)}")

        comments: List[CommentData] = [] # Initialize comments list
        if request_data.include_comments and video_info.get('comment_count', 0) > 0:
            logging.info(f"[{video_id}] Fetching comments (max {request_data.max_comments}).")
            comments = youtube_service.get_video_comments(
                request_data.video_id,
                request_data.max_comments
            )
            logging.info(f"[{video_id}] Fetched {len(comments)} comments.")

            if comments:
                comment_analysis['analyzed_comments'] = len(comments)

                # Sentiment analysis
                if request_data.include_sentiment:
                    logging.info(f"[{video_id}] Starting sentiment analysis on {len(comments)} comments.")
                    # sentiment_results now contains ONLY the detailed sentiment data
                    sentiment_detailed_results = sentiment_service.analyze_comments(comments)

                    # Assign the detailed results to the nested key
                    comment_analysis['sentiment_analysis'] = sentiment_detailed_results

                    # Now, derive the top-level sentiment_scores and sentiment_distribution
                    # from the detailed results or by calling a helper in SentimentService.
                    # We'll re-use the _calculate_sentiment_metrics helper from SentimentService.
                    
                    # Extract raw scores and labels from the detailed results
                    raw_scores_for_aggregates = [
                        {'pos': c['positive_score'], 'neg': c['negative_score'], 'neu': c['neutral_score'], 'compound': c['sentiment_score']}
                        for c in sentiment_detailed_results.get('all_comments_sentiment', [])
                    ]
                    raw_labels_for_aggregates = [
                        c['sentiment_label'] for c in sentiment_detailed_results.get('all_comments_sentiment', [])
                    ]

                    aggregate_sentiment_metrics = sentiment_service._calculate_sentiment_metrics(
                        raw_scores_for_aggregates,
                        raw_labels_for_aggregates,
                        len(comments) # Pass the actual number of comments analyzed
                    )

                    # Populate the top-level 'sentiment_scores' and 'sentiment_distribution'
                    comment_analysis['sentiment_scores'] = aggregate_sentiment_metrics['sentiment_scores']
                    comment_analysis['sentiment_distribution'] = aggregate_sentiment_metrics['sentiment_distribution']
                    
                    # Also include other aggregate metrics at the top level of comment_analysis
                    comment_analysis['overall_sentiment'] = aggregate_sentiment_metrics['overall_sentiment']
                    comment_analysis['sentiment_strength'] = aggregate_sentiment_metrics['sentiment_strength']
                    comment_analysis['polarization_index'] = aggregate_sentiment_metrics['polarization_index']
                    comment_analysis['sentiment_percentages'] = aggregate_sentiment_metrics['sentiment_percentages']


                    logging.info(f"[{video_id}] Sentiment analysis completed and results populated.")

                # Keyword extraction
                if request_data.include_keywords:
                    logging.info(f"[{video_id}] Starting keyword extraction from {len(comments)} comments.")
                    keywords = keyword_service.extract_keywords_from_comments(comments)
                    comment_analysis['keywords'] = keywords
                    logging.info(f"[{video_id}] Keyword extraction completed.")

                # Toxicity detection
                if request_data.include_toxicity:
                    logging.info(f"[{video_id}] Starting toxicity detection on {len(comments)} comments.")
                    toxicity_results = toxicity_service.analyze_comment_toxicity(comments)
                    comment_analysis['toxicity_analysis'] = toxicity_results
                    logging.info(f"[{video_id}] Toxicity detection completed.")
            else:
                logging.info(f"[{video_id}] No comments fetched for analysis.")
                comment_analysis['analyzed_comments'] = 0 # Ensure analyzed_comments is 0 if no comments are fetched

        # Build response
        response_data = {
            'video_info': video_info,
            'engagement_metrics': engagement_metrics,
            'comment_analysis': comment_analysis, # This now contains the full sentiment_analysis nested
            'performance_insights': performance_insights,
            'session_id': session_id
        }
        logging.info(f"[{video_id}] Response data built.")

        # Store in session
        logging.info(f"[{video_id}] Storing data in session storage.")
        session_storage.store_data(session_id, f"video_analysis_{video_id}", response_data)
        logging.info(f"[{video_id}] Data stored in session storage.")

        logging.info(f"[{video_id}] Returning analysis result.")
        return response_data

    except HTTPException as http_exc:
        logging.error(f"[{video_id}] HTTP Exception caught: {http_exc.detail}", exc_info=True)
        raise http_exc
    except Exception as e:
        logging.error(f"[{video_id}] Unhandled error during video analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing video: {str(e)}"
        )

@router.get("/video/{video_id}/comments")
async def get_video_comments(
    video_id: str,
    max_comments: int = 100,
    youtube_service: "YouTubeService" = Depends(get_youtube_service)
):
    """
    Get comments for a video

    - **video_id**: YouTube video ID
    - **max_comments**: Maximum number of comments to fetch (1-500)
    """
    try:
        # Validate video ID
        if not DataProcessor.validate_youtube_id(video_id, 'video'):
            raise HTTPException(
                status_code=400,
                detail="Invalid video ID format"
            )

        # Validate max_comments
        max_comments = max(1, min(500, max_comments))

        # Fetch comments
        comments = youtube_service.get_video_comments(video_id, max_comments)

        if not comments:
            return {
                'video_id': video_id,
                'comments': [],
                'total_fetched': 0,
                'message': 'No comments found or comments are disabled for this video'
            }

        # Format comments for response
        comments_response = []
        for comment in comments:
            comments_response.append({
                'id': comment.id,
                'text': comment.text,
                'author': comment.author,
                'published_at': comment.published_at.isoformat(),
                'like_count': comment.like_count,
                'reply_count': comment.reply_count,
                'text_length': len(comment.text),
                'has_replies': comment.reply_count > 0
            })

        return {
            'video_id': video_id,
            'comments': comments_response,
            'total_fetched': len(comments_response),
            'max_requested': max_comments
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching comments: {str(e)}"
        )

@router.get("/video/{video_id}/sentiment")
async def analyze_video_sentiment(
    video_id: str,
    max_comments: int = 500,
    session_id: Optional[str] = None,
    youtube_service: "YouTubeService" = Depends(get_youtube_service),
    sentiment_service: "SentimentService" = Depends(get_sentiment_service)
):
    """
    Analyze sentiment of video comments

    - **video_id**: YouTube video ID
    - **max_comments**: Maximum number of comments to analyze
    - **session_id**: Optional session ID to check for cached data
    """
    try:
        # Check if analysis already exists in session
        if session_id:
            cached_data = session_storage.get_data(session_id, f"video_analysis_{video_id}")
            if cached_data and 'comment_analysis' in cached_data:
                sentiment_data = cached_data['comment_analysis'].get('sentiment_analysis', {})
                
                if sentiment_data:
                    # If we only need the detailed sentiment_analysis data, return it directly.
                    # This endpoint is specifically for sentiment, so returning the full detailed
                    # sentiment_analysis object makes sense here.
                    return {
                        'video_id': video_id,
                        'sentiment_analysis': sentiment_data,
                        'data_source': 'session_cache'
                    }

        # Fetch comments and analyze sentiment
        comments = youtube_service.get_video_comments(video_id, max_comments)

        if not comments:
            return {
                'video_id': video_id,
                'sentiment_analysis': {},
                'message': 'No comments available for sentiment analysis'
            }

        # Perform sentiment analysis (get the detailed results)
        sentiment_detailed_results = sentiment_service.analyze_comments(comments)

        # Get aggregate metrics using the helper from SentimentService
        raw_scores_for_aggregates = [
            {'pos': c['positive_score'], 'neg': c['negative_score'], 'neu': c['neutral_score'], 'compound': c['sentiment_score']}
            for c in sentiment_detailed_results.get('all_comments_sentiment', [])
        ]
        raw_labels_for_aggregates = [
            c['sentiment_label'] for c in sentiment_detailed_results.get('all_comments_sentiment', [])
        ]

        aggregate_sentiment_metrics = sentiment_service._calculate_sentiment_metrics(
            raw_scores_for_aggregates,
            raw_labels_for_aggregates,
            len(comments) # Pass the actual number of comments analyzed
        )

        response_data = {
            'video_id': video_id,
            'sentiment_analysis': sentiment_detailed_results, # Returns the full detailed sentiment_analysis here
            'sentiment_scores': aggregate_sentiment_metrics['sentiment_scores'],
            'sentiment_distribution': aggregate_sentiment_metrics['sentiment_distribution'],
            'overall_sentiment': aggregate_sentiment_metrics['overall_sentiment'],
            'sentiment_strength': aggregate_sentiment_metrics['sentiment_strength'],
            'polarization_index': aggregate_sentiment_metrics['polarization_index'],
            'sentiment_percentages': aggregate_sentiment_metrics['sentiment_percentages'],
            'sentiment_trends': sentiment_service.get_sentiment_trends(comments),
            'sentiment_by_engagement': sentiment_service.get_sentiment_by_engagement(comments),
            'analyzed_comments': len(comments)
        }

        # Store in session if session_id provided
        if session_id:
            # Store the full detailed response for this specific endpoint
            session_storage.store_data(session_id, f"video_sentiment_{video_id}", response_data)

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing sentiment: {str(e)}"
        )

@router.get("/video/{video_id}/toxicity")
async def analyze_video_toxicity(
    video_id: str,
    max_comments: int = 500,
    session_id: Optional[str] = None,
    youtube_service: "YouTubeService" = Depends(get_youtube_service),
    toxicity_service: "ToxicityService" = Depends(get_toxicity_service)
):
    """
    Analyze toxicity in video comments

    - **video_id**: YouTube video ID
    - **max_comments**: Maximum number of comments to analyze
    - **session_id**: Optional session ID to check for cached data
    """
    try:
        # Check if analysis already exists in session
        if session_id:
            cached_data = session_storage.get_data(session_id, f"video_analysis_{video_id}")
            if cached_data and 'comment_analysis' in cached_data:
                toxicity_data = cached_data['comment_analysis'].get('toxicity_analysis', {})
                if toxicity_data:
                    return {
                        'video_id': video_id,
                        'toxicity_analysis': toxicity_data,
                        'data_source': 'session_cache'
                    }

        # Fetch comments and analyze toxicity
        comments = youtube_service.get_video_comments(video_id, max_comments)

        if not comments:
            return {
                'video_id': video_id,
                'toxicity_analysis': {},
                'message': 'No comments available for toxicity analysis'
            }

        # Perform toxicity analysis
        toxicity_results = toxicity_service.analyze_comment_toxicity(comments)

        # Get toxicity trends over time
        toxicity_trends = toxicity_service.get_toxicity_trends(comments)

        # Get toxicity by engagement level
        toxicity_by_engagement = toxicity_service.get_toxicity_by_engagement(comments)

        response_data = {
            'video_id': video_id,
            'toxicity_analysis': toxicity_results,
            'toxicity_trends': toxicity_trends,
            'toxicity_by_engagement': toxicity_by_engagement,
            'analyzed_comments': len(comments)
        }

        # Store in session if session_id provided
        if session_id:
            session_storage.store_data(session_id, f"video_toxicity_{video_id}", response_data)

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing toxicity: {str(e)}"
        )

@router.get("/video/{video_id}/export")
async def export_video_analysis(
    video_id: str,
    session_id: str,
    background_tasks: BackgroundTasks,
    export_service: ExportService = Depends(get_export_service)
):
    """
    Export video analysis data to CSV

    - **video_id**: YouTube video ID
    - **session_id**: Session ID containing analysis data
    """
    try:
        # Get data from session
        analysis_data = session_storage.get_data(session_id, f"video_analysis_{video_id}")
        if not analysis_data:
            raise HTTPException(
                status_code=404,
                detail="Video analysis data not found in session. Please run analysis first."
            )

        # Export to CSV
        filename = export_service.export_video_analysis(analysis_data)
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
            detail=f"Error exporting video analysis: {str(e)}"
        )

@router.get("/video/{video_id}/keywords")
async def extract_video_keywords(
    video_id: str,
    include_comments: bool = True,
    max_comments: int = 500,
    youtube_service: "YouTubeService" = Depends(get_youtube_service),
    keyword_service: "KeywordService" = Depends(get_keyword_service)
):
    """
    Extract keywords from video title, description, and comments

    - **video_id**: YouTube video ID
    - **include_comments**: Whether to include comments in keyword extraction
    - **max_comments**: Maximum number of comments to analyze
    """
    try:
        # Get video information
        video_info = youtube_service.get_video_info(video_id)
        if not video_info:
            raise HTTPException(
                status_code=404,
                detail=f"Video not found: {video_id}"
            )

        keywords_response = {
            'video_id': video_id,
            'title_keywords': [],
            'description_keywords': [],
            'comment_keywords': [],
            'combined_keywords': []
        }

        # Extract keywords from title
        if video_info.get('title'):
            title_keywords = keyword_service.extract_keywords_from_text(
                video_info['title'], top_k=10
            )
            keywords_response['title_keywords'] = title_keywords

        # Extract keywords from description
        if video_info.get('description'):
            description_keywords = keyword_service.extract_keywords_from_text(
                video_info['description'], top_k=15
            )
            keywords_response['description_keywords'] = description_keywords

        # Extract keywords from comments if requested
        if include_comments:
            comments = youtube_service.get_video_comments(video_id, max_comments)
            if comments:
                comment_keywords = keyword_service.extract_keywords_from_comments(
                    comments, top_k=20
                )
                keywords_response['comment_keywords'] = comment_keywords

        # Combine all keywords (remove duplicates and sort by relevance)
        all_keywords = (
            keywords_response['title_keywords'] +
            keywords_response['description_keywords'] +
            keywords_response['comment_keywords']
        )

        # Deduplicate and sort
        seen_keywords = set()
        combined_keywords = []
        for keyword_obj in sorted(all_keywords, key=lambda x: x.get('relevance_score', 0), reverse=True):
            keyword = keyword_obj['keyword']
            if keyword not in seen_keywords:
                seen_keywords.add(keyword)
                combined_keywords.append(keyword_obj)

        keywords_response['combined_keywords'] = combined_keywords[:25]

        return keywords_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting keywords: {str(e)}"
        )