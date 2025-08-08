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
import ComparisonBarChart from '../components/charts/ComparisonBarChart'; // Re-added and added this import
import { ChannelComparisonRadar, VideoPerformanceRadar } from '../components/charts/RadarChart';

const ComparisonPage = () => {
  const [comparisonType, setComparisonType] = useState('channels'); // 'channels' or 'videos'
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      items: [{ id: '' }, { id: '' }] // Start with 2 empty items
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const handleCompare = async (formData) => {
    const ids = formData.items
      .map(item => extractYouTubeId(item.id.trim(), comparisonType === 'channels' ? 'channel' : 'video'))
      .filter(id => id); // Remove empty/invalid IDs

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
                          if (!value.trim() && index >= 2) return true; // Optional for items beyond first 2
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
const ChannelComparisonResults = ({ data }) => (
  <div className="space-y-6">
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
        data={data.channels}
        metricKey="avg_views_per_video"
        title="Average Views per Video"
      />
    </div>
    
    {/* Radar Chart for Overall Performance */}
    <ChannelComparisonRadar
      channels={data.channels}
      title="Overall Performance Comparison"
    />

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
              <th className="table-header-cell">Created</th>
              <th className="table-header-cell">Country</th>
              <th className="table-header-cell">Description</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {data.channels.map((channel) => (
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
                <td className="table-cell">
                  {formatNumber(Math.round(channel.view_count / Math.max(1, channel.video_count)))}
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

    {/* Removed: Comparison Tables */}
    {/* These were commented out in your original code. You can choose to use the new bar charts instead, or uncomment these to show both.
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ComparisonTable data={data.channels} metrics={[{ key: 'subscriber_count', header: 'Subscribers', formatter: formatNumber }]} title="Subscriber Comparison" />
      <ComparisonTable data={data.channels} metrics={[{ key: 'view_count', header: 'Total Views', formatter: formatNumber }]} title="Total Views Comparison" />
      <ComparisonTable data={data.channels} metrics={[{ key: 'video_count', header: 'Video Count', formatter: formatNumber }]} title="Video Count Comparison" />
      <ComparisonTable data={data.channels} metrics={[{ key: 'avg_views_per_video', header: 'Avg Views/Video', formatter: formatNumber }]} title="Average Views per Video" />
    </div> */}

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

// Video Comparison Results Component
const VideoComparisonResults = ({ data }) => (
  <div className="space-y-6">
    
    {/* NEW: Detailed Performance Metrics */}
    <h3 className="text-xl font-bold text-gray-900">Performance Comparison</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ComparisonBarChart
        data={data.videos}
        metricKey="view_count"
        title="Views Comparison"
        comparisonType="videos"
      />
      <ComparisonBarChart
        data={data.videos}
        metricKey="like_count"
        title="Likes Comparison"
        comparisonType="videos"
      />
      <ComparisonBarChart
        data={data.videos}
        metricKey="comment_count"
        title="Comments Comparison"
        comparisonType="videos"
      />
      
      {/* Bar Chart for Engagement Rate */}
      {data.comparison_metrics?.engagement_rates && (
        <ComparisonBarChart
          data={data.videos.map((video, index) => ({
            ...video,
            engagement_rate: data.comparison_metrics.engagement_rates[index]
          }))}
          metricKey="engagement_rate"
          title="Engagement Rate Comparison"
          comparisonType="videos"
        />
      )}

      {/* Bar Chart for Video Duration */}
      {data.comparison_metrics?.duration_seconds && (
        <ComparisonBarChart
          data={data.videos.map((video, index) => ({
            ...video,
            duration_seconds: data.comparison_metrics.duration_seconds[index]
          }))}
          metricKey="duration_seconds"
          title="Video Duration Comparison"
          comparisonType="videos"
        />
      )}
      
      {/* Bar Chart for Views per Hour */}
      {data.engagement_comparison?.views_per_hour && (
        <ComparisonBarChart
          data={data.videos.map((video, index) => ({
            ...video,
            views_per_hour: data.engagement_comparison.views_per_hour[index]
          }))}
          metricKey="views_per_hour"
          title="Views Per Hour Comparison"
          comparisonType="videos"
        />
      )}
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
              <th className="table-header-cell">Published</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {data.videos.map((video) => (
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
                <td className="table-cell">{video.duration}</td>
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

// Engagement Comparison Component
const EngagementComparison = ({ data, videos }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Analysis</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Like Rates</h4>
        <div className="space-y-2">
          {videos.map((video, index) => (
            <div key={video.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-900 truncate">
                {truncateText(video.title, 25)}
              </span>
              <span className="text-sm font-medium text-blue-600">
                {data.like_rates[index].toFixed(3)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Comment Rates</h4>
        <div className="space-y-2">
          {videos.map((video, index) => (
            <div key={video.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-900 truncate">
                {truncateText(video.title, 25)}
              </span>
              <span className="text-sm font-medium text-green-600">
                {data.comment_rates[index].toFixed(3)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Views per Hour</h4>
        <div className="space-y-2">
          {videos.map((video, index) => (
            <div key={video.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-900 truncate">
                {truncateText(video.title, 25)}
              </span>
              <span className="text-sm font-medium text-purple-600">
                {formatNumber(Math.round(data.views_per_hour[index]))}
              </span>
            </div>
          ))}
        </div>
      </div>
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
    { name: 'MrBeast vs PewDiePie', ids: ['UCX6OQ3DkcsbYNE6H8uQQuVA', 'UC-lHJZR3Gqxm24_Vd_AJ5Yw'] },
    { name: 'Top Tech Channels', ids: ['UCBJycsmduvYEL83R_U4JriQ', 'UC6nSFpj9HTCZ5t-N3Rm3-HA', 'UCOmcA3f_RrH6b9NmcNa4tdg'] }
  ];

  const sampleVideos = [
    { name: 'Popular Music Videos', ids: ['dQw4w9WgXcQ', 'kJQP7kiw5Fk', 'JGwWNGJdvx8'] },
    { name: 'Viral TikTok Hits', ids: ['OvEuZ3mNSY', 'fNVV_PjeIRQ', 'M7FIvfx5J10'] }
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