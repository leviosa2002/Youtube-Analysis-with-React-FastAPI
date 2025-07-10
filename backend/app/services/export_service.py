"""
CSV export service for YouTube analytics data
"""
import pandas as pd
import io
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import tempfile

class ExportService:
    """Service for exporting analytics data to CSV format"""
    
    def __init__(self):
        """Initialize export service"""
        self.temp_dir = tempfile.gettempdir()
    
    def export_channel_analysis(self, channel_data: Dict[str, Any]) -> str:
        """Export channel analysis data to CSV"""
        try:
            # Create comprehensive channel report
            data_frames = {}
            
            # Channel basic info
            if 'channel_info' in channel_data:
                info = channel_data['channel_info']
                channel_df = pd.DataFrame([{
                    'Channel ID': info.get('id', ''),
                    'Channel Name': info.get('title', ''),
                    'Subscriber Count': info.get('subscriber_count', 0),
                    'Total Views': info.get('view_count', 0),
                    'Video Count': info.get('video_count', 0),
                    'Country': info.get('country', 'N/A'),
                    'Created Date': info.get('published_at', ''),
                    'Custom URL': info.get('custom_url', 'N/A')
                }])
                data_frames['Channel_Info'] = channel_df
            
            # Growth data
            if 'growth_data' in channel_data:
                growth_df = pd.DataFrame(channel_data['growth_data'])
                data_frames['Growth_Trends'] = growth_df
            
            # Upload frequency heatmap
            if 'upload_frequency' in channel_data and 'heatmap_data' in channel_data['upload_frequency']:
                heatmap_df = pd.DataFrame(channel_data['upload_frequency']['heatmap_data'])
                data_frames['Upload_Frequency'] = heatmap_df
            
            # Top keywords
            if 'top_keywords' in channel_data:
                keywords_df = pd.DataFrame(channel_data['top_keywords'])
                data_frames['Top_Keywords'] = keywords_df
            
            # Recent videos
            if 'recent_videos' in channel_data:
                videos_df = pd.DataFrame(channel_data['recent_videos'])
                data_frames['Recent_Videos'] = videos_df
            
            return self._create_multi_sheet_csv(data_frames, 'channel_analysis')
            
        except Exception as e:
            print(f"Error exporting channel analysis: {e}")
            return self._create_error_csv('channel_analysis', str(e))
    
    def export_video_analysis(self, video_data: Dict[str, Any]) -> str:
        """Export video analysis data to CSV"""
        try:
            data_frames = {}
            
            # Video basic info
            if 'video_info' in video_data:
                info = video_data['video_info']
                video_df = pd.DataFrame([{
                    'Video ID': info.get('id', ''),
                    'Title': info.get('title', ''),
                    'Channel': info.get('channel_title', ''),
                    'Views': info.get('view_count', 0),
                    'Likes': info.get('like_count', 0),
                    'Comments': info.get('comment_count', 0),
                    'Duration': info.get('duration', ''),
                    'Published Date': info.get('published_at', ''),
                    'Tags': ', '.join(info.get('tags', []))
                }])
                data_frames['Video_Info'] = video_df
            
            # Engagement metrics
            if 'engagement_metrics' in video_data:
                engagement_df = pd.DataFrame([video_data['engagement_metrics']])
                data_frames['Engagement_Metrics'] = engagement_df
            
            # Comment analysis
            if 'comment_analysis' in video_data:
                comment_data = video_data['comment_analysis']
                
                # Sentiment analysis
                if 'sentiment_scores' in comment_data:
                    sentiment_df = pd.DataFrame([comment_data['sentiment_scores']])
                    data_frames['Sentiment_Scores'] = sentiment_df
                
                # Keywords
                if 'keywords' in comment_data:
                    keywords_df = pd.DataFrame(comment_data['keywords'])
                    data_frames['Comment_Keywords'] = keywords_df
                
                # Toxicity analysis
                if 'toxicity_analysis' in comment_data:
                    toxicity_data = comment_data['toxicity_analysis']
                    toxicity_df = pd.DataFrame([{
                        'Total Comments Analyzed': toxicity_data.get('total_comments_analyzed', 0),
                        'Toxic Comments Count': toxicity_data.get('toxic_comments_count', 0),
                        'Toxicity Rate (%)': toxicity_data.get('toxicity_rate', 0),
                        'Average Toxicity Score': toxicity_data.get('avg_toxicity_score', 0),
                        'Community Health Score': toxicity_data.get('community_health_score', {}).get('score', 0),
                        'Health Level': toxicity_data.get('community_health_score', {}).get('level', 'Unknown')
                    }])
                    data_frames['Toxicity_Analysis'] = toxicity_df
                    
                    # Most toxic comments
                    if 'most_toxic_comments' in toxicity_data:
                        toxic_comments_df = pd.DataFrame(toxicity_data['most_toxic_comments'])
                        data_frames['Toxic_Comments'] = toxic_comments_df
            
            return self._create_multi_sheet_csv(data_frames, 'video_analysis')
            
        except Exception as e:
            print(f"Error exporting video analysis: {e}")
            return self._create_error_csv('video_analysis', str(e))
    
    def export_trending_analysis(self, trending_data: Dict[str, Any]) -> str:
        """Export trending analysis data to CSV"""
        try:
            data_frames = {}
            
            # Trending videos
            if 'videos' in trending_data:
                videos_df = pd.DataFrame([
                    {
                        'Video ID': video.get('id', ''),
                        'Title': video.get('title', ''),
                        'Channel': video.get('channel_title', ''),
                        'Views': video.get('view_count', 0),
                        'Likes': video.get('like_count', 0),
                        'Comments': video.get('comment_count', 0),
                        'Category ID': video.get('category_id', ''),
                        'Duration': video.get('duration', ''),
                        'Published Date': video.get('published_at', ''),
                        'Thumbnail URL': video.get('thumbnail_url', '')
                    }
                    for video in trending_data['videos']
                ])
                data_frames['Trending_Videos'] = videos_df
            
            # Velocity data
            if 'velocity_data' in trending_data:
                velocity_df = pd.DataFrame(trending_data['velocity_data'])
                data_frames['View_Velocity'] = velocity_df
            
            # Category distribution
            if 'category_distribution' in trending_data:
                category_df = pd.DataFrame([
                    {'Category ID': k, 'Video Count': v}
                    for k, v in trending_data['category_distribution'].items()
                ])
                data_frames['Category_Distribution'] = category_df
            
            return self._create_multi_sheet_csv(data_frames, 'trending_analysis')
            
        except Exception as e:
            print(f"Error exporting trending analysis: {e}")
            return self._create_error_csv('trending_analysis', str(e))
    
    def export_comparison_analysis(self, comparison_data: Dict[str, Any], 
                                 comparison_type: str) -> str:
        """Export comparison analysis data to CSV"""
        try:
            data_frames = {}
            
            if comparison_type == 'channel':
                # Channel comparison
                if 'channels' in comparison_data:
                    channels_df = pd.DataFrame([
                        {
                            'Channel ID': channel.get('id', ''),
                            'Channel Name': channel.get('title', ''),
                            'Subscribers': channel.get('subscriber_count', 0),
                            'Total Views': channel.get('view_count', 0),
                            'Video Count': channel.get('video_count', 0),
                            'Country': channel.get('country', 'N/A'),
                            'Created Date': channel.get('published_at', '')
                        }
                        for channel in comparison_data['channels']
                    ])
                    data_frames['Channel_Comparison'] = channels_df
                
                # Comparison metrics
                if 'comparison_metrics' in comparison_data:
                    metrics_data = []
                    for metric, values in comparison_data['comparison_metrics'].items():
                        for i, value in enumerate(values):
                            metrics_data.append({
                                'Channel_Index': i,
                                'Metric': metric,
                                'Value': value
                            })
                    metrics_df = pd.DataFrame(metrics_data)
                    data_frames['Comparison_Metrics'] = metrics_df
                
            elif comparison_type == 'video':
                # Video comparison
                if 'videos' in comparison_data:
                    videos_df = pd.DataFrame([
                        {
                            'Video ID': video.get('id', ''),
                            'Title': video.get('title', ''),
                            'Channel': video.get('channel_title', ''),
                            'Views': video.get('view_count', 0),
                            'Likes': video.get('like_count', 0),
                            'Comments': video.get('comment_count', 0),
                            'Duration': video.get('duration', ''),
                            'Published Date': video.get('published_at', '')
                        }
                        for video in comparison_data['videos']
                    ])
                    data_frames['Video_Comparison'] = videos_df
            
            # Rankings
            if 'rankings' in comparison_data:
                rankings_data = []
                for metric, rankings in comparison_data['rankings'].items():
                    for ranking in rankings:
                        rankings_data.append({
                            'Metric': metric,
                            'Rank': ranking.get('rank', 0),
                            'ID': ranking.get('id', ''),
                            'Name': ranking.get('name', ''),
                            'Value': ranking.get('value', 0)
                        })
                rankings_df = pd.DataFrame(rankings_data)
                data_frames['Rankings'] = rankings_df
            
            # Insights
            if 'insights' in comparison_data:
                insights_df = pd.DataFrame([
                    {'Insight': insight}
                    for insight in comparison_data['insights']
                ])
                data_frames['Insights'] = insights_df
            
            filename = f'{comparison_type}_comparison'
            return self._create_multi_sheet_csv(data_frames, filename)
            
        except Exception as e:
            print(f"Error exporting comparison analysis: {e}")
            return self._create_error_csv('comparison_analysis', str(e))
    
    def _create_multi_sheet_csv(self, data_frames: Dict[str, pd.DataFrame], 
                               base_filename: str) -> str:
        """Create a combined CSV file from multiple DataFrames"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{base_filename}_{timestamp}.csv"
            filepath = os.path.join(self.temp_dir, filename)
            
            # Combine all dataframes with sheet identifiers
            combined_data = []
            
            for sheet_name, df in data_frames.items():
                if not df.empty:
                    # Add sheet identifier
                    df_copy = df.copy()
                    df_copy.insert(0, 'Sheet', sheet_name)
                    combined_data.append(df_copy)
                    
                    # Add separator row
                    separator = pd.DataFrame([['---'] * len(df_copy.columns)], 
                                           columns=df_copy.columns)
                    combined_data.append(separator)
            
            if combined_data:
                final_df = pd.concat(combined_data, ignore_index=True)
                final_df.to_csv(filepath, index=False, encoding='utf-8')
            else:
                # Create empty file with header
                pd.DataFrame({'Message': ['No data available for export']}).to_csv(
                    filepath, index=False, encoding='utf-8'
                )
            
            return filename
            
        except Exception as e:
            print(f"Error creating CSV file: {e}")
            return self._create_error_csv(base_filename, str(e))
    
    def _create_error_csv(self, base_filename: str, error_message: str) -> str:
        """Create an error CSV file"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{base_filename}_error_{timestamp}.csv"
            filepath = os.path.join(self.temp_dir, filename)
            
            error_df = pd.DataFrame([{
                'Error': 'Export Failed',
                'Message': error_message,
                'Timestamp': datetime.now().isoformat()
            }])
            
            error_df.to_csv(filepath, index=False, encoding='utf-8')
            return filename
            
        except Exception as e:
            print(f"Error creating error CSV: {e}")
            return f"export_error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    def get_file_path(self, filename: str) -> str:
        """Get full file path for a filename"""
        return os.path.join(self.temp_dir, filename)
    
    def cleanup_file(self, filename: str) -> bool:
        """Clean up temporary export file"""
        try:
            filepath = self.get_file_path(filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return False
        except Exception as e:
            print(f"Error cleaning up file {filename}: {e}")
            return False