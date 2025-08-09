import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  GitCompare,
  Plus,
  Minus,
  Download,
  Youtube,
  Video,
  ExternalLink
} from 'lucide-react';

import { comparisonAPI } from '../services/api';
import { extractYouTubeId, formatNumber, formatRelativeTime, truncateText } from '../services/utils';
import { exportComparisonData } from '../services/csvExport';

import LoadingSpinner, { DataLoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ComparisonTable from '../components/charts/ComparisonTable';
import ComparisonBarChart from '../components/charts/ComparisonBarChart';
import { ChannelComparisonRadar, VideoPerformanceRadar } from '../components/charts/RadarChart';

// Helper functions - defined first to avoid reference errors
const parseDurationToMinutes = (duration) => {
  if (!duration) return 0;
  
  // Handle ISO 8601 duration format (PT#M#S) or simple format
  if (duration.startsWith('PT')) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);
      return hours * 60 + minutes + seconds / 60;
    }
  }
  
  // Handle MM:SS or HH:MM:SS format
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60; // HH:MM:SS
  }
  
  return 0;
};

const calculateDurationScore = (durationInMinutes) => {
  // Normalize duration to a 0-100 scale for radar chart
  // Optimal video length is considered around 8-12 minutes for engagement
  // This creates a bell curve where 10 minutes = 100 points
  if (durationInMinutes === 0) return 0;
  
  const optimalDuration = 10; // minutes
  const maxScore = 100;
  
  // Calculate score based on distance from optimal duration
  const distanceFromOptimal = Math.abs(durationInMinutes - optimalDuration);
  const score = Math.max(0, maxScore - (distanceFromOptimal * 5)); // Lose 5 points per minute away from optimal
  
  return Math.min(score, maxScore);
};

const calculateViewsPerHour = (video) => {
  if (!video.published_at || !video.view_count) return 0;
  
  const publishDate = new Date(video.published_at);
  const now = new Date();
  const hoursSincePublished = (now - publishDate) / (1000 * 60 * 60);
  
  return hoursSincePublished > 0 ? video.view_count / hoursSincePublished : 0;
};

const calculateActivityScore = (channel) => {
  if (!channel.published_at || !channel.video_count) return 0;
  
  const publishDate = new Date(channel.published_at);
  const now = new Date();
  const daysSinceCreated = (now - publishDate) / (1000 * 60 * 60 * 24);
  const videosPerDay = channel.video_count / Math.max(daysSinceCreated, 1);
  
  // Normalize to a 0-100 scale (assuming 1 video per day is very active)
  return Math.min(videosPerDay * 100, 100);
};

const calculatePerformanceScore = (video, engagementRate, viewsPerHour, durationInMinutes = 0) => {
  // Combine normalized engagement rate, views per hour, and duration efficiency into a performance score
  const normalizedEngagement = Math.min(engagementRate * 10, 100); // Scale engagement rate
  const normalizedViewsPerHour = Math.min(viewsPerHour / 1000, 100); // Scale views per hour
  const durationScore = calculateDurationScore(durationInMinutes); // Duration efficiency
  
  // Weight the components: 40% engagement, 40% viral velocity, 20% duration efficiency
  return (normalizedEngagement * 0.4) + (normalizedViewsPerHour * 0.4) + (durationScore * 0.2);
};

// Data preparation functions
const prepareChannelDataForRadar = (channels) => {
  return channels.map(channel => {
    // Calculate engagement rate if not provided
    const avgEngagement = channel.avg_engagement_rate || 
      ((channel.like_count || 0) + (channel.comment_count || 0)) / Math.max(channel.view_count || 1, 1) * 100;
    
    // Calculate average views per video
    const avgViewsPerVideo = channel.avg_views_per_video || 
      (channel.view_count || 0) / Math.max(channel.video_count || 1, 1);
    
    // Calculate subscriber to view ratio (efficiency metric)
    const subscriberViewRatio = channel.subscriber_count > 0 ? 
      (channel.view_count || 0) / channel.subscriber_count : 0;

    return {
      ...channel,
      // Ensure all metrics are present with fallbacks
      subscriber_count: channel.subscriber_count || 0,
      view_count: channel.view_count || 0,
      video_count: channel.video_count || 0,
      avg_views_per_video: Math.round(avgViewsPerVideo),
      engagement_rate: avgEngagement,
      subscriber_view_ratio: subscriberViewRatio,
      // Activity score based on video count and recency
      activity_score: calculateActivityScore(channel)
    };
  });
};

const prepareVideoDataForRadar = (videos, comparisonData) => {
  return videos.map((video, index) => {
    // Parse duration to minutes for comparison
    const durationInMinutes = parseDurationToMinutes(video.duration);
    
    // Calculate engagement rate
    const engagementRate = comparisonData?.comparison_metrics?.engagement_rates?.[index] || 
      ((video.like_count || 0) + (video.comment_count || 0)) / Math.max(video.view_count || 1, 1) * 100;
    
    // Calculate views per hour since publication
    const viewsPerHour = comparisonData?.engagement_comparison?.views_per_hour?.[index] || 
      calculateViewsPerHour(video);
    
    // Calculate like to view ratio
    const likeToViewRatio = video.view_count > 0 ? 
      (video.like_count || 0) / video.view_count * 100 : 0;
    
    // Calculate comment to view ratio
    const commentToViewRatio = video.view_count > 0 ? 
      (video.comment_count || 0) / video.view_count * 100 : 0;

    // Calculate views per minute of content (content efficiency)
    const viewsPerMinute = durationInMinutes > 0 ? (video.view_count || 0) / durationInMinutes : 0;

    return {
      ...video,
      // Ensure all metrics are present with fallbacks
      view_count: video.view_count || 0,
      like_count: video.like_count || 0,
      comment_count: video.comment_count || 0,
      duration_minutes: durationInMinutes,
      duration_score: calculateDurationScore(durationInMinutes), // Normalized duration score
      engagement_rate: engagementRate,
      views_per_hour: viewsPerHour,
      views_per_minute: viewsPerMinute,
      like_ratio: likeToViewRatio,
      comment_ratio: commentToViewRatio,
      // Performance score combining multiple factors
      performance_score: calculatePerformanceScore(video, engagementRate, viewsPerHour, durationInMinutes)
    };
  });
};

// Main component
const ComparisonPage = () => {
  const [comparisonType, setComparisonType] = useState('channels');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      items: [{ id: '' }, { id: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const handleCompare = async (formData) => {
    const ids = formData.items
      .map(item => extractYouTubeId(item.id.trim(), comparisonType === 'channels' ? 'channel' : 'video'))
      .filter(id => id);

    if (ids.length < 2) {
      setError('Please provide at least 2 valid IDs for comparison');
      return;
    }

    if (ids.length > 5) {
      setError('Maximum 5 items can be compared at once');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (comparisonType === 'channels') {
        result = await comparisonAPI.compareChannels(ids);
      } else {
        result = await comparisonAPI.compareVideos(ids);
      }

      setComparisonData(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Comparison failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!comparisonData) return;

    setExportLoading(true);
    try {
      if (comparisonType === 'channels') {
        exportComparisonData.channelComparison(comparisonData);
      } else {
        exportComparisonData.videoComparison(comparisonData);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const addItem = () => {
    if (fields.length < 5) {
      append({ id: '' });
    }
  };

  const removeItem = (index) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  const switchComparisonType = (type) => {
    setComparisonType(type);
    setComparisonData(null);
    setError(null);
    reset({ items: [{ id: '' }, { id: '' }] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comparison Analysis</h1>
          <p className="text-gray-600 mt-1">
            Compare multiple YouTube channels or videos side-by-side with detailed metrics
          </p>
        </div>

        {comparisonData && (
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="btn-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export Comparison'}
          </button>
        )}
      </div>

      {/* Comparison Type Toggle */}
      <div className="card">
        <div className="flex items-center justify-center">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => switchComparisonType('channels')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                comparisonType === 'channels'
                  ? 'bg-white text-youtube-red shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Youtube className="w-4 h-4 mr-2 inline" />
              Compare Channels
            </button>
            <button
              onClick={() => switchComparisonType('videos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                comparisonType === 'videos'
                  ? 'bg-white text-youtube-red shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Video className="w-4 h-4 mr-2 inline" />
              Compare Videos
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Form */}
      <div className="card">
        <form onSubmit={handleSubmit(handleCompare)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {comparisonType === 'channels' ? 'YouTube Channels' : 'YouTube Videos'} to Compare
            </h3>
            <span className="text-sm text-gray-500">
              {fields.length}/5 items
            </span>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      {...register(`items.${index}.id`, {
                        required: index < 2 ? `${comparisonType === 'channels' ? 'Channel' : 'Video'} ID is required` : false,
                        validate: (value) => {
                          if (!value.trim() && index >= 2) return true;
                          const extracted = extractYouTubeId(value.trim(), comparisonType === 'channels' ? 'channel' : 'video');
                          return extracted ? true : 'Please enter a valid YouTube ID or URL';
                        }
                      })}
                      type="text"
                      placeholder={`${comparisonType === 'channels' ? 'Channel' : 'Video'} ID or URL`}
                      className="input-field pr-12"
                    />
                    {comparisonType === 'channels' ? (
                      <Youtube className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    ) : (
                      <Video className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  {errors.items?.[index]?.id && (
                    <p className="text-red-600 text-sm mt-1">{errors.items[index].id.message}</p>
                  )}
                </div>

                {fields.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {fields.length < 5 && (
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another {comparisonType === 'channels' ? 'Channel' : 'Video'}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            {loading ? 'Comparing...' : `Compare ${comparisonType === 'channels' ? 'Channels' : 'Videos'}`}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <DataLoadingSpinner text={`Analyzing ${comparisonType} and generating comparison...`} />
      )}

      {/* Error State */}
      {error && (
        <ErrorMessage
          title="Comparison Failed"
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      {/* Results */}
      {comparisonData && (
        <div className="space-y-6">
          {comparisonType === 'channels' ? (
            <ChannelComparisonResults data={comparisonData} />
          ) : (
            <VideoComparisonResults data={comparisonData} />
          )}
        </div>
      )}

      {/* Sample Data */}
      <SampleDataSection
        comparisonType={comparisonType}
        onLoadSample={(sampleIds) => {
          const newItems = sampleIds.map(id => ({ id }));
          reset({ items: newItems });
        }}
      />
    </div>
  );
};

// Channel Comparison Results Component
const ChannelComparisonResults = ({ data }) => {
  // Prepare enhanced data for radar chart
  const enhancedChannelData = prepareChannelDataForRadar(data.channels);

  // Debug log to check what data we're sending
  console.log('Enhanced Channel Data for Radar:', enhancedChannelData);

  return (
    <div className="space-y-6">
      {/* Radar Chart for Overall Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Performance Comparison</h3>
        <ChannelComparisonRadar
          channels={enhancedChannelData}
          title="Overall Performance Comparison"
          // Explicitly define which metrics to show
          metrics={[
            { key: 'subscriber_count', label: 'Subscribers', normalize: true },
            { key: 'view_count', label: 'Total Views', normalize: true },
            { key: 'video_count', label: 'Video Count', normalize: true },
            { key: 'avg_views_per_video', label: 'Avg Views/Video', normalize: true },
            { key: 'engagement_rate', label: 'Engagement Rate', normalize: false, max: 100 },
            { key: 'activity_score', label: 'Activity Score', normalize: false, max: 100 }
          ]}
        />
      </div>

      {/* Bar Charts for key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComparisonBarChart
          data={data.channels}
          metricKey="subscriber_count"
          title="Subscriber Comparison"
        />
        <ComparisonBarChart
          data={data.channels}
          metricKey="view_count"
          title="Total Views Comparison"
        />
        <ComparisonBarChart
          data={data.channels}
          metricKey="video_count"
          title="Video Count Comparison"
        />
        <ComparisonBarChart
          data={enhancedChannelData}
          metricKey="avg_views_per_video"
          title="Average Views per Video"
        />
      </div>

      {/* Additional Bar Charts for Enhanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComparisonBarChart
          data={enhancedChannelData}
          metricKey="engagement_rate"
          title="Channel Engagement Rate (%)"
          formatValue={(value) => `${value.toFixed(2)}%`}
        />
        <ComparisonBarChart
          data={enhancedChannelData}
          metricKey="activity_score"
          title="Channel Activity Score"
          formatValue={(value) => `${value.toFixed(1)}/100`}
        />
      </div>

      {/* Overview Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Overview</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Channel</th>
                <th className="table-header-cell">Subscribers</th>
                <th className="table-header-cell">Total Views</th>
                <th className="table-header-cell">Videos</th>
                <th className="table-header-cell">Avg Views/Video</th>
                <th className="table-header-cell">Engagement Rate</th>
                <th className="table-header-cell">Created</th>
                <th className="table-header-cell">Country</th>
                <th className="table-header-cell">Description</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {enhancedChannelData.map((channel) => (
                <tr key={channel.id}>
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      {channel.thumbnail_url && (
                        <img
                          src={channel.thumbnail_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {truncateText(channel.title, 25)}
                          </span>
                          <a
                            href={`https://www.youtube.com/channel/${channel.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-youtube-red hover:text-youtube-darkRed"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        {channel.custom_url && (
                          <p className="text-xs text-gray-500">{channel.custom_url}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{formatNumber(channel.subscriber_count)}</td>
                  <td className="table-cell">{formatNumber(channel.view_count)}</td>
                  <td className="table-cell">{formatNumber(channel.video_count)}</td>
                  <td className="table-cell">{formatNumber(channel.avg_views_per_video)}</td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-blue-600">
                      {channel.engagement_rate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="table-cell">{formatRelativeTime(channel.published_at)}</td>
                  <td className="table-cell">{channel.country || 'N/A'}</td>
                  <td className="table-cell">
                    <p className="text-xs text-gray-500">
                      {truncateText(channel.description, 100)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rankings */}
      {data.rankings && (
        <ComparisonRankings rankings={data.rankings} type="channels" />
      )}

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <ComparisonInsights insights={data.insights} />
      )}
    </div>
  );
};

// Video Comparison Results Component
const VideoComparisonResults = ({ data }) => {
  // Prepare enhanced data for radar chart and bar charts
  const enhancedVideoData = prepareVideoDataForRadar(data.videos, data);
  
  // Debug log to check what data we're sending
  console.log('Enhanced Video Data for Radar:', enhancedVideoData);
  
  // Create data arrays for specific bar charts
  const engagementBarData = enhancedVideoData.map(video => ({
    ...video,
    engagement_rate: video.engagement_rate
  }));

  const viewsPerHourBarData = enhancedVideoData.map(video => ({
    ...video,
    views_per_hour: video.views_per_hour
  }));

  const durationBarData = enhancedVideoData.map(video => ({
    ...video,
    duration_minutes: video.duration_minutes
  }));

  return (
    <div className="space-y-6">
      
      {/* Radar Chart for a holistic view of key performance metrics */}
      <h3 className="text-xl font-bold text-gray-900">Key Performance Metrics</h3>
      <div className="card">
        <VideoPerformanceRadar
          videos={enhancedVideoData}
          title="Video Performance Comparison"
          // Explicitly define which metrics to show
          metrics={[
            { key: 'view_count', label: 'Views', normalize: true },
            { key: 'like_count', label: 'Likes', normalize: true },
            { key: 'comment_count', label: 'Comments', normalize: true },
            { key: 'duration_score', label: 'Duration Score', normalize: false, max: 100 },
            { key: 'engagement_rate', label: 'Engagement Rate', normalize: false, max: 100 },
            { key: 'views_per_hour', label: 'Viral Velocity', normalize: true }
          ]}
        />
      </div>
      
      <hr />
      
      {/* Bar Charts for primary metrics */}
      <h3 className="text-xl font-bold text-gray-900">Performance Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComparisonBarChart
          data={data.videos}
          metricKey="view_count"
          title="Views Comparison"
          comparisonType="videos"
        />
        <ComparisonBarChart
          data={engagementBarData}
          metricKey="engagement_rate"
          title="Engagement Rate Comparison"
          comparisonType="videos"
          formatValue={(value) => `${value.toFixed(2)}%`}
        />
        <ComparisonBarChart
          data={data.videos}
          metricKey="like_count"
          title="Likes Comparison"
          comparisonType="videos"
        />
        <ComparisonBarChart
          data={viewsPerHourBarData}
          metricKey="views_per_hour"
          title="Views Per Hour Comparison"
          comparisonType="videos"
          formatValue={(value) => `${formatNumber(Math.round(value))}/hr`}
        />
      </div>

      {/* Additional Performance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ComparisonBarChart
          data={durationBarData}
          metricKey="duration_minutes"
          title="Video Duration Comparison"
          comparisonType="videos"
          formatValue={(value) => `${value.toFixed(1)} min`}
        />
        <ComparisonBarChart
          data={enhancedVideoData}
          metricKey="performance_score"
          title="Overall Performance Score"
          comparisonType="videos"
          formatValue={(value) => `${value.toFixed(1)}/100`}
        />
      </div>

      <hr />

      {/* Overview Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Overview</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Video</th>
                <th className="table-header-cell">Channel</th>
                <th className="table-header-cell">Views</th>
                <th className="table-header-cell">Likes</th>
                <th className="table-header-cell">Comments</th>
                <th className="table-header-cell">Duration</th>
                <th className="table-header-cell">Engagement</th>
                <th className="table-header-cell">Published</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {enhancedVideoData.map((video) => (
                <tr key={video.id}>
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      {video.thumbnail_url && (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          className="w-16 h-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {truncateText(video.title, 30)}
                          </span>
                          <a
                            href={`https://www.youtube.com/watch?v=${video.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-youtube-red hover:text-youtube-darkRed"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{truncateText(video.channel_title, 20)}</td>
                  <td className="table-cell">{formatNumber(video.view_count)}</td>
                  <td className="table-cell">{formatNumber(video.like_count)}</td>
                  <td className="table-cell">{formatNumber(video.comment_count)}</td>
                  <td className="table-cell">
                    <div>
                      <div className="text-sm">{video.duration}</div>
                      <div className="text-xs text-gray-500">
                        {video.duration_minutes.toFixed(1)} min
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-green-600">
                      {video.engagement_rate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="table-cell">{formatRelativeTime(video.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <hr />

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <ComparisonInsights insights={data.insights} />
      )}
    </div>
  );
};

// Comparison Rankings Component
const ComparisonRankings = ({ rankings, type }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Rankings</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(rankings).map(([metric, ranking]) => (
        <div key={metric} className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
            {metric.replace(/_/g, ' ')}
          </h4>
          <div className="space-y-2">
            {ranking.slice(0, 3).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    'bg-orange-600'
                  }`}>
                    {item.rank}
                  </span>
                  <span className="text-sm text-gray-900 truncate">
                    {truncateText(item.name, 20)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {item.formatted_value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Comparison Insights Component
const ComparisonInsights = ({ insights }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight, index) => (
        <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
          <p className="text-sm text-gray-700">{insight}</p>
        </div>
      ))}
    </div>
  </div>
);

// Sample Data Section Component
const SampleDataSection = ({ comparisonType, onLoadSample }) => {
  const sampleChannels = [
    { name: 'Top Tech Channels', ids: ['UCBJycsmduvYEL83R_U4JriQ', 'UC6nSFpj9HTCZ5t-N3Rm3-HA', 'UCOmcA3f_RrH6b9NmcNa4tdg'] }
  ];

  const sampleVideos = [
    { name: 'Popular Music Videos', ids: ['dQw4w9WgXcQ', 'kJQP7kiw5Fk', 'JGwWNGJdvx8'] }
  ];

  const samples = comparisonType === 'channels' ? sampleChannels : sampleVideos;

  return (
    <div className="card">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Try with Sample Data
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Load sample {comparisonType} for quick comparison testing
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {samples.map((sample, index) => (
            <button
              key={index}
              onClick={() => onLoadSample(sample.ids)}
              className="p-4 border border-gray-200 rounded-lg hover:border-youtube-red hover:bg-red-50 transition-colors group text-left"
            >
              <div className="flex items-center space-x-3">
                {comparisonType === 'channels' ? (
                  <Youtube className="w-6 h-6 text-youtube-red" />
                ) : (
                  <Video className="w-6 h-6 text-youtube-red" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-youtube-red">
                    {sample.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {sample.ids.length} {comparisonType}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComparisonPage;