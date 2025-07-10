import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Youtube,
  Search,
  Download,
  RefreshCw,
  ExternalLink,
  Calendar,
  Users,
  Eye,
  PlayCircle,
  Hash,
  TrendingUp,
  Clock,
  Link as LinkIcon // Renamed to avoid conflict with React Router Link if used
} from 'lucide-react'

import { useChannelData } from '../hooks/useChannelData'
import { extractYouTubeId, formatNumber, formatRelativeTime, unique } from '../services/utils'
import { exportChannelData } from '../services/csvExport'

import LoadingSpinner, { ChannelLoadingSpinner } from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { GrowthLineChart } from '../components/charts/LineChart' // Assume this is configured for dual axis or handles separate data
import { KeywordsBarChart } from '../components/charts/BarChart' // Not used in current code, but good to have
import { UploadFrequencyHeatmap } from '../components/charts/HeatmapChart'
import { KeywordWordCloud } from '../components/charts/WordCloud'

const ChannelPage = () => {
  const location = useLocation()
  const {
    analyzeChannel,
    channelData,
    hasData,
    loading,
    error,
    canExport,
    exportChannelAnalysis,
    exportLoading,
    retryAnalysis,
    reset
  } = useChannelData()

  const [analysisOptions, setAnalysisOptions] = useState({
    includeVideos: true,
    maxVideos: 50,
    includeKeywords: true
  })

  const { register, handleSubmit, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log(errors)
    }
  }, [errors])

  useEffect(() => {
    if (location.state?.channelId) {
      setValue('channelId', location.state.channelId)
      handleAnalyze({ channelId: location.state.channelId })
    }
  }, [location.state, setValue])

  const handleAnalyze = async (formData) => {
    const channelId = extractYouTubeId(formData.channelId.trim(), 'channel')

    if (!channelId) {
      return
    }

    await analyzeChannel(channelId, analysisOptions)
  }

  const handleExport = async () => {
    if (!canExport || !channelData) return

    try {
      await exportChannelAnalysis(
        channelData.channel_info.id,
        channelData.session_id
      )
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleExportSection = (section) => {
    if (!channelData) return

    switch (section) {
      case 'info':
        exportChannelData.channelInfo(channelData.channel_info)
        break
      case 'videos':
        exportChannelData.channelVideos(channelData.recent_videos, channelData.channel_info.id)
        break
      case 'growth':
        exportChannelData.growthData(channelData.growth_data, channelData.channel_info.id)
        break
      case 'keywords':
        exportChannelData.keywords(channelData.top_keywords, channelData.channel_info.id)
        break
      default:
        break;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channel Analysis</h1>
          <p className="text-gray-600 mt-1">
            Analyze YouTube channels for growth trends, content patterns, and audience insights
          </p>
        </div>

        {hasData && (
          <div className="flex space-x-3">
            <button
              onClick={retryAnalysis}
              disabled={loading}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleExport}
              disabled={!canExport || exportLoading}
              className="btn-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export All'}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Form */}
      <div className="card">
        <form onSubmit={(e) => {
          handleSubmit(handleAnalyze)(e);
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Channel ID or URL
            </label>
            <div className="relative">
              <input
                {...register('channelId', {
                  required: 'Channel ID or URL is required',
                  validate: (value) => {
                    const extracted = extractYouTubeId(value.trim(), 'channel');
                    return extracted !== null || 'Please enter a valid YouTube channel ID or URL';
                  }
                })}
                type="text"
                placeholder="UCX6OQ3DkcsbYNE6H8uQQuVA or @NetflixIndiaOfficial or youtube.com/user/pewdiepie"
                className="input-field pr-12"
              />
              <Youtube className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {errors.channelId && (
              <p className="text-red-600 text-sm mt-1">{errors.channelId.message}</p>
            )}
          </div>

          {/* Analysis Options */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisOptions.includeVideos}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    includeVideos: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-youtube-red focus:ring-youtube-red"
                />
                <span className="ml-2 text-sm text-gray-700">Include Recent Videos</span>
              </label>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Videos</label>
                <select
                  value={analysisOptions.maxVideos}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    maxVideos: parseInt(e.target.value)
                  }))}
                  className="text-sm border-gray-300 rounded"
                >
                  <option value={25}>25 videos</option>
                  <option value={50}>50 videos</option>
                </select>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisOptions.includeKeywords}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    includeKeywords: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-youtube-red focus:ring-youtube-red"
                />
                <span className="ml-2 text-sm text-gray-700">Extract Keywords</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? 'Analyzing...' : 'Analyze Channel'}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <ChannelLoadingSpinner text="Fetching channel data and analyzing content..." />
      )}

      {/* Error State */}
      {error && (
        <ErrorMessage
          title="Analysis Failed"
          message={error}
          onRetry={retryAnalysis}
        />
      )}

      {/* Results */}
      {hasData && channelData && (
        <div className="space-y-6">
          {/* Channel Overview */}
          <ChannelOverview
            channel={channelData.channel_info}
            onExport={() => handleExportSection('info')}
          />

          {/* Metrics Grid */}
          <ChannelMetrics channel={channelData.channel_info} />

          {/* Charts and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Chart */}
            {channelData.growth_data && channelData.growth_data.length > 0 && (
              <div className="lg:col-span-2">
                <GrowthLineChart
                  data={channelData.growth_data}
                  title="Channel Growth Over Time"
                  // You'll need to pass props to configure dual axis here
                  // Example (conceptual): primaryDataKey="cumulative_views" secondaryDataKey="video_count"
                />
              </div>
            )}

            {/* Upload Frequency Heatmap & Details */}
            {channelData.upload_frequency && channelData.upload_frequency.heatmap_data.length > 0 && (
              <> {/* Use Fragment to group multiple elements */}
                <UploadFrequencyHeatmap
                  data={channelData.upload_frequency.heatmap_data}
                  title="Upload Frequency Pattern"
                />
                <UploadFrequencyDetails
                  uploadFrequency={channelData.upload_frequency}
                />
              </>
            )}

            {/* Keywords Analysis */}
            {channelData.top_keywords && channelData.top_keywords.length > 0 && (
              <div className="lg:col-span-2 space-y-4"> {/* Changed to lg:col-span-2 to give more space for keywords */}
                {(() => {
                  const seen = new Set();
                  const uniqueKeywords = channelData.top_keywords.filter(item => {
                    const isDuplicate = seen.has(item.keyword);
                    seen.add(item.keyword);
                    return !isDuplicate;
                  });

                  return (
                    <>
                      <KeywordWordCloud
                        keywords={uniqueKeywords}
                        title="Popular Keywords"
                      />
                      <KeywordsTable
                        keywords={uniqueKeywords}
                        onExport={() => handleExportSection('keywords')}
                      />
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Recent Videos */}
          {channelData.recent_videos && channelData.recent_videos.length > 0 && (
            <RecentVideos
              videos={channelData.recent_videos}
              channelId={channelData.channel_info.id}
              onExport={() => handleExportSection('videos')}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Channel Overview Component (remains the same)
const ChannelOverview = ({ channel, onExport }) => (
  <div className="card">
    <div className="flex items-start justify-between mb-6">
      <h2 className="text-xl font-semibold text-gray-900">Channel Overview</h2>
      <button onClick={onExport} className="btn-secondary text-sm">
        <Download className="w-4 h-4 mr-2" />
        Export Info
      </button>
    </div>

    <div className="flex items-start space-x-6">
      {channel.thumbnail_url && (
        <img
          src={channel.thumbnail_url}
          alt={channel.title}
          className="w-20 h-20 rounded-lg object-cover"
        />
      )}

      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <h3 className="text-2xl font-bold text-gray-900">{channel.title}</h3>
          <a
            href={`https://www.youtube.com/channel/${channel.id}`} // Corrected YouTube channel URL
            target="_blank"
            rel="noopener noreferrer"
            className="text-youtube-red hover:text-youtube-darkRed"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">Channel ID</p>
            <p className="font-mono text-xs text-gray-800 break-all">{channel.id}</p>
          </div>

          {channel.custom_url && (
            <div>
              <p className="text-sm text-gray-600">Custom URL</p>
              <p className="text-sm text-gray-900">{channel.custom_url}</p>
            </div>
          )}

          {channel.country && (
            <div>
              <p className="text-sm text-gray-600">Country</p>
              <p className="text-sm text-gray-900">{channel.country}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="text-sm text-gray-900">
              {formatRelativeTime(channel.published_at)}
            </p>
          </div>
        </div>

        {channel.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">Description</p>
            <p className="text-sm text-gray-800 line-clamp-3">
              {channel.description}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
)

// Channel Metrics Component (remains the same)
const ChannelMetrics = ({ channel }) => {
  const metrics = [
    {
      label: 'Subscribers',
      value: formatNumber(channel.subscriber_count),
      icon: Users,
      color: 'text-red-600'
    },
    {
      label: 'Total Views',
      value: formatNumber(channel.view_count),
      icon: Eye,
      color: 'text-blue-600'
    },
    {
      label: 'Total Videos',
      value: formatNumber(channel.video_count),
      icon: PlayCircle,
      color: 'text-green-600'
    },
    {
      label: 'Avg Views/Video',
      value: formatNumber(Math.round(channel.view_count / Math.max(1, channel.video_count))),
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <div key={metric.label} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-6 h-6 ${metric.color}`} />
            </div>
            <p className="metric-value">{metric.value}</p>
            <p className="metric-label">{metric.label}</p>
          </div>
        )
      })}
    </div>
  )
}

// NEW COMPONENT: Upload Frequency Details
const UploadFrequencyDetails = ({ uploadFrequency }) => {
  // Helper to convert day number to name
  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Schedule Insights</h3>
      <div className="space-y-3">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-gray-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Average Days Between Uploads:</p>
            <p className="text-md font-medium text-gray-900">{uploadFrequency.average_days_between_uploads.toFixed(2)} days</p>
          </div>
        </div>
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-gray-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Last Upload Date:</p>
            <p className="text-md font-medium text-gray-900">{uploadFrequency.last_upload_date}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-gray-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Next Expected Upload Date:</p>
            <p className="text-md font-medium text-gray-900">{uploadFrequency.next_expected_upload_date || 'N/A'}</p>
          </div>
        </div>
        {uploadFrequency.stats && (
          <>
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Most Active Upload Day:</p>
                <p className="text-md font-medium text-gray-900">{getDayName(uploadFrequency.stats.most_active_day)}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Most Active Upload Hour (24h):</p>
                <p className="text-md font-medium text-gray-900">{uploadFrequency.stats.most_active_hour}:00</p>
              </div>
            </div>
            <div className="flex items-center">
              <Hash className="w-5 h-5 text-gray-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Average Uploads per Week:</p>
                <p className="text-md font-medium text-gray-900">{uploadFrequency.stats.avg_uploads_per_week.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// NEW COMPONENT: KeywordsTable
const KeywordsTable = ({ keywords, onExport }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Detailed Keywords</h3>
      <button onClick={onExport} className="btn-secondary text-sm">
        <Download className="w-4 h-4 mr-2" />
        Export Keywords
      </button>
    </div>

    <div className="overflow-x-auto">
      <table className="table">
        <thead className="table-header">
          <tr>
            <th className="table-header-cell">Keyword</th>
            <th className="table-header-cell">Count</th>
            <th className="table-header-cell">Relevance</th>
            <th className="table-header-cell">Percentage</th>
          </tr>
        </thead>
        <tbody className="table-body">
          {keywords.map((kw, index) => (
            <tr key={kw.keyword || index}> {/* Use keyword as key if unique, otherwise index */}
              <td className="table-cell font-medium">{kw.keyword}</td>
              <td className="table-cell">{kw.count}</td>
              <td className="table-cell">{(kw.relevance_score * 100).toFixed(1)}%</td>
              <td className="table-cell">{kw.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);


// Recent Videos Component (modified to include tags, and updated YouTube link)
const RecentVideos = ({ videos, channelId, onExport }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Recent Videos ({videos.length})
      </h3>
      <button onClick={onExport} className="btn-secondary text-sm">
        <Download className="w-4 h-4 mr-2" />
        Export Videos
      </button>
    </div>

    <div className="overflow-x-auto">
      <table className="table">
        <thead className="table-header">
          <tr>
            <th className="table-header-cell">Title</th>
            <th className="table-header-cell">Published</th>
            <th className="table-header-cell">Views</th>
            <th className="table-header-cell">Likes</th>
            <th className="table-header-cell">Comments</th>
            <th className="table-header-cell">Duration</th>
            <th className="table-header-cell">Engagement</th>
            <th className="table-header-cell">Tags</th> {/* New column */}
          </tr>
        </thead>
        <tbody className="table-body">
          {videos.slice(0, 10).map((video) => (
            <tr key={video.id}>
              <td className="table-cell">
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`} // Corrected YouTube video URL
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-youtube-red hover:text-youtube-darkRed font-medium"
                >
                  {video.title.length > 50 ? video.title.substring(0, 50) + '...' : video.title}
                </a>
              </td>
              <td className="table-cell text-gray-500">
                {formatRelativeTime(video.published_at)}
              </td>
              <td className="table-cell">{formatNumber(video.view_count)}</td>
              <td className="table-cell">{formatNumber(video.like_count)}</td>
              <td className="table-cell">{formatNumber(video.comment_count)}</td>
              <td className="table-cell">{video.duration_formatted}</td>
              <td className="table-cell">
                <span className={`badge ${
                  video.engagement_rate >= 5 ? 'badge-success' :
                  video.engagement_rate >= 2 ? 'badge-warning' :
                  'badge-error'
                }`}>
                  {video.engagement_rate.toFixed(2)}%
                </span>
              </td>
              <td className="table-cell text-sm text-gray-600"> {/* New column content */}
                {video.tags && video.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {video.tags.length > 3 && ` +${video.tags.length - 3} more`}
                  </div>
                ) : (
                  'N/A'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {videos.length > 10 && (
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Showing 10 of {videos.length} videos. Export to see all videos.
        </p>
      </div>
    )}
  </div>
)

export default ChannelPage