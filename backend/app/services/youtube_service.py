import os
from googleapiclient.discovery import build, Resource
from googleapiclient.errors import HttpError
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone # Ensure timezone is imported
from dateutil import parser # Ensure dateutil.parser is imported
import re
import logging
from dataclasses import asdict

from app.config import settings
from app.models.channel import (
    ChannelData, VideoData, GrowthData, KeywordData, UploadFrequencyData, ChannelProcessor
)
from app.models.video import CommentData # Assuming CommentData is defined in app.models.video

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self, youtube_client: Resource, youtube_transcript_api_client: Any):
        self.youtube = youtube_client
        self.youtube_transcript_api = youtube_transcript_api_client
        self.channel_processor = ChannelProcessor()
        logger.info("YouTubeService initialized with pre-built API client and Transcript API.")

    def get_channel_info(self, channel_id: str) -> Optional[ChannelData]:
        try:
            request = self.youtube.channels().list(
                part="snippet,statistics",
                id=channel_id
            )
            response = request.execute()
            
            if response and response.get('items'):
                # Ensure ChannelData.from_api_response also handles timezone correctly
                return ChannelData.from_api_response(response['items'][0])
            else:
                logging.warning(f"No channel info found for ID: {channel_id}")
                return None
        except Exception as e:
            logging.error(f"Error fetching channel info for ID {channel_id}: {e}")
            return None

    def get_channel_videos(self, channel_id: str, max_results: int = 50) -> List[VideoData]:
        videos = []
        try:
            channel_request = self.youtube.channels().list(
                part="contentDetails",
                id=channel_id
            )
            channel_response = channel_request.execute()
            
            if not channel_response or not channel_response.get('items'):
                logging.warning(f"Could not get content details for channel {channel_id}")
                return []
                
            uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
            
            next_page_token = None
            while len(videos) < max_results:
                playlist_request = self.youtube.playlistItems().list(
                    part="snippet",
                    playlistId=uploads_playlist_id,
                    maxResults=min(max_results - len(videos), 50),
                    pageToken=next_page_token
                )
                playlist_response = playlist_request.execute()
                
                video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_response.get('items', [])]
                if not video_ids:
                    break

                # Get full video details (statistics, contentDetails, snippet)
                video_details_request = self.youtube.videos().list(
                    part="snippet,statistics,contentDetails",
                    id=",".join(video_ids)
                )
                video_details_response = video_details_request.execute()

                for item in video_details_response.get('items', []):
                    # VideoData.from_api_response must handle timezone conversion correctly
                    videos.append(VideoData.from_api_response(item))
                
                next_page_token = playlist_response.get('nextPageToken')
                if not next_page_token:
                    break
        except Exception as e:
            logging.error(f"Error fetching videos for channel {channel_id}: {e}")
        return videos
    
    def get_video_info(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed video information"""
        try:
            request = self.youtube.videos().list(
                part="snippet,statistics,contentDetails",
                id=video_id
            )
            response = request.execute()
            
            if not response.get('items'):
                logging.info(f"No video info found for ID: {video_id}")
                return None
                
            video_data = response['items'][0]
            snippet = video_data.get('snippet', {})
            statistics = video_data.get('statistics', {})
            content_details = video_data.get('contentDetails', {})
            
            published_at_str = snippet.get('publishedAt', '')
            parsed_published_at = None # Initialize variable

            if published_at_str:
                try:
                    # --- CORRECTED LINE FOR published_at ---
                    # Parse the string and make it explicitly UTC-aware
                    parsed_published_at = parser.parse(published_at_str).astimezone(timezone.utc)
                except ValueError:
                    logging.warning(f"Failed to parse published_at: {published_at_str} for video {video_id}")
                    # Keep as None or handle default if parsing fails

            return {
                'id': video_data.get('id', ''),
                'title': snippet.get('title', ''),
                'description': snippet.get('description', ''),
                'published_at': parsed_published_at, # Use the parsed datetime object
                'channel_id': snippet.get('channelId', ''),
                'channel_title': snippet.get('channelTitle', ''),
                'duration': content_details.get('duration', ''),
                'view_count': int(statistics.get('viewCount', 0)),
                'like_count': int(statistics.get('likeCount', 0)),
                'comment_count': int(statistics.get('commentCount', 0)),
                'tags': snippet.get('tags', []),
                'thumbnail_url': snippet.get('thumbnails', {}).get('high', {}).get('url', '')
            }
            
        except HttpError as e:
            logging.error(f"YouTube API HTTP error in get_video_info: {e.resp.status} - {e.content.decode()}")
            return None
        except Exception as e:
            logging.error(f"Error fetching video info: {e}", exc_info=True)
            return None
    
    def get_video_comments(self, video_id: str, max_results: int = 500) -> List[CommentData]:
        """Fetch video comments"""
        try:
            comments = []
            next_page_token = None
            
            while len(comments) < max_results:
                request = self.youtube.commentThreads().list(
                    part="snippet",
                    videoId=video_id,
                    maxResults=min(100, max_results - len(comments)),
                    pageToken=next_page_token,
                    order="relevance"
                )
                response = request.execute()
                
                for item in response.get('items', []):
                    try:
                        comment = CommentData.from_api_response(item)
                        comments.append(comment)
                    except Exception as e:
                        logging.warning(f"Error parsing comment from video {video_id}: {e}")
                        continue
                
                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
            
            return comments[:max_results]
            
        except HttpError as e:
            logging.error(f"YouTube API HTTP error in get_video_comments: {e.resp.status} - {e.content.decode()}")
            return []
        except Exception as e:
            logging.error(f"Error fetching comments: {e}", exc_info=True)
            return []
    
    def get_trending_videos(self, country_code: str = "US", 
                            category_id: Optional[str] = None,
                            max_results: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch trending videos using the 'mostPopular' chart.
        The 'mostPopular' chart does not support 'publishedAfter' filtering.
        """
        try:
            logging.info(f"Fetching trending videos for country: {country_code}, category: {category_id}, max_results: {max_results}")

            request_params = {
                "part": "snippet,statistics,contentDetails",
                "chart": "mostPopular",
                "regionCode": country_code,
                "maxResults": max_results
            }

            if category_id:
                request_params["videoCategoryId"] = category_id
            
            request = self.youtube.videos().list(**request_params)
            response = request.execute()
            
            logging.info(f"YouTube API 'mostPopular' response (items count): {len(response.get('items', []))}")
            
            trending_videos = []
            for item in response.get('items', []):
                snippet = item.get('snippet', {})
                statistics = item.get('statistics', {})
                content_details = item.get('contentDetails', {})
                
                view_count = int(statistics.get('viewCount', 0))
                like_count = int(statistics.get('likeCount', 0))
                comment_count = int(statistics.get('commentCount', 0))

                published_at_str = snippet.get('publishedAt', '')
                published_at = None
                if published_at_str:
                    try:
                        # --- CORRECTED LINE FOR trending videos published_at ---
                        published_at = parser.parse(published_at_str).astimezone(timezone.utc)
                    except ValueError:
                        logging.warning(f"Failed to parse published_at: {published_at_str} for video {item.get('id', 'unknown')}")

                trending_videos.append({
                    'id': item.get('id', ''),
                    'title': snippet.get('title', ''),
                    'channel_title': snippet.get('channelTitle', ''),
                    'published_at': published_at, # Use the parsed datetime object
                    'view_count': view_count,
                    'like_count': like_count,
                    'comment_count': comment_count,
                    'category_id': snippet.get('categoryId', ''),
                    'duration': content_details.get('duration', ''),
                    'thumbnail_url': snippet.get('thumbnails', {}).get('high', {}).get('url', '')
                })
            
            return trending_videos
            
        except HttpError as e:
            error_details = e.content.decode()
            logging.error(f"YouTube API HTTP error in get_trending_videos: Status {e.resp.status}, Details: {error_details}")
            return []
        except Exception as e:
            logging.error(f"An unexpected error occurred fetching trending videos: {e}", exc_info=True)
            return []
    
    def _get_video_details(self, video_ids: List[str]) -> List[VideoData]:
        """Get detailed information for multiple videos"""
        try:
            request = self.youtube.videos().list(
                part="snippet,statistics,contentDetails",
                id=",".join(video_ids)
            )
            response = request.execute()
            
            videos = []
            for item in response.get('items', []):
                try:
                    # VideoData.from_api_response must handle timezone conversion correctly
                    video = VideoData.from_api_response(item)
                    videos.append(video)
                except Exception as e:
                    logging.warning(f"Error parsing video details for ID {item.get('id', 'unknown')}: {e}")
                    continue
            
            return videos
            
        except HttpError as e:
            logging.error(f"YouTube API HTTP error in _get_video_details: {e.resp.status} - {e.content.decode()}")
            return []
        except Exception as e:
            logging.error(f"Error fetching video details: {e}", exc_info=True)
            return []
    
    def extract_and_rank_keywords(self, videos: List[VideoData], channel_description: str) -> List[KeywordData]:
        """
        Extracts and ranks top keywords using the ChannelProcessor.
        Requires the list of videos and the channel's main description.
        """
        return self.channel_processor.extract_top_keywords(videos, channel_description)