import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Video,
  Search,
  Download,
  RefreshCw,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  Hash,
  TrendingUp,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

import { useVideoData } from '../hooks/useVideoData'
import { extractYouTubeId, formatNumber, formatRelativeTime, formatDuration } from '../services/utils'
import { exportVideoData } from '../services/csvExport'

import LoadingSpinner, { VideoLoadingSpinner } from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { SentimentPieChart } from '../components/charts/PieChart'
import { SentimentBarChart } from '../components/charts/BarChart'
import { KeywordWordCloud, CommentWordCloud } from '../components/charts/WordCloud'

const VideoPage = () => {
  const location = useLocation()
  const {
    analyzeVideo,
    videoData,
    hasData,
    loading,
    error,
    canExport,
    exportVideoAnalysis,
    exportLoading,
    retryAnalysis,
    reset
  } = useVideoData()

  const [analysisOptions, setAnalysisOptions] = useState({
    includeComments: true,
    maxComments: 500,
    includeSentiment: true,
    includeKeywords: true,
    includeToxicity: true
  })

  const { register, handleSubmit, setValue, formState: { errors } } = useForm()

  // Handle pre-filled video ID from navigation state
  useEffect(() => {
    if (location.state?.videoId) {
      setValue('videoId', location.state.videoId)
      handleAnalyze({ videoId: location.state.videoId })
    }
  }, [location.state, setValue])

  const handleAnalyze = async (formData) => {
    // Check if React Hook Form has validation errors *before* proceeding
    if (Object.keys(errors).length > 0) {
      return; // Stop if there are form validation errors
    }

    const rawInput = formData.videoId ? formData.videoId.trim() : '';
    const videoId = extractYouTubeId(rawInput, 'video')

    if (!videoId) {
      // You might want to set a user-facing error message here
      return
    }

    // Call the analyzeVideo hook function
    await analyzeVideo(videoId, analysisOptions)
  }

  const handleExport = async () => {
    if (!canExport || !videoData) {
      return
    }

    try {
      await exportVideoAnalysis(
        videoData.video_info.id,
        videoData.session_id
      )
    } catch (error) {
      console.error('VideoPage: handleExport - Export failed:', error);
    }
  }

  const handleExportSection = (section) => {
    if (!videoData) {
      return
    }

    switch (section) {
      case 'info':
        exportVideoData.videoInfo(videoData.video_info)
        break
      case 'sentiment':
        if (videoData.comment_analysis?.sentiment_scores) {
          exportVideoData.sentimentAnalysis(videoData.comment_analysis.sentiment_scores, videoData.video_info.id)
        }
        break
      case 'toxicity':
        if (videoData.comment_analysis?.toxicity_analysis) {
          exportVideoData.toxicityAnalysis(videoData.comment_analysis.toxicity_analysis, videoData.video_info.id)
        }
        break
      default:
        console.warn('VideoPage: handleExportSection - Unknown section for export:', section);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Analysis</h1>
          <p className="text-gray-600 mt-1">
            Analyze YouTube videos for engagement, sentiment, and audience insights
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
        <form onSubmit={handleSubmit(handleAnalyze)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Video ID or URL
            </label>
            <div className="relative">
              <input
                {...register('videoId', {
                  required: 'Video ID or URL is required',
                  validate: (value) => {
                    const extracted = extractYouTubeId(value.trim(), 'video')
                    return extracted ? true : 'Please enter a valid YouTube video ID or URL';
                  }
                })}
                type="text"
                placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=..."
                className="input-field pr-12"
              />
              <Video className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {errors.videoId && (
              <p className="text-red-600 text-sm mt-1">{errors.videoId.message}</p>
            )}
          </div>

          {/* Analysis Options */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisOptions.includeComments}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    includeComments: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-youtube-red focus:ring-youtube-red"
                />
                <span className="ml-2 text-sm text-gray-700">Analyze Comments</span>
              </label>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Comments</label>
                <select
                  value={analysisOptions.maxComments}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    maxComments: parseInt(e.target.value)
                  }))}
                  className="text-sm border-gray-300 rounded w-full"
                >
                  <option value={100}>100 comments</option>
                  <option value={250}>250 comments</option>
                  <option value={500}>500 comments</option>
                </select>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisOptions.includeSentiment}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    includeSentiment: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-youtube-red focus:ring-youtube-red"
                />
                <span className="ml-2 text-sm text-gray-700">Sentiment Analysis</span>
              </label>

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

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={analysisOptions.includeToxicity}
                  onChange={(e) => setAnalysisOptions(prev => ({
                    ...prev,
                    includeToxicity: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-youtube-red focus:ring-youtube-red"
                />
                <span className="ml-2 text-sm text-gray-700">Toxicity Detection</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? 'Analyzing...' : 'Analyze Video'}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <VideoLoadingSpinner text="Analyzing video and processing comments..." />
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
      {hasData && videoData && (
        <div className="space-y-6">
          {/* Video Overview */}
          <VideoOverview
            video={videoData.video_info}
            engagement={videoData.engagement_metrics}
            performance={videoData.performance_insights}
            onExport={() => handleExportSection('info')}
          />

          {/* Metrics Grid */}
          <VideoMetrics
            video={videoData.video_info}
            engagement={videoData.engagement_metrics}
          />

          {/* Comment Analysis */}
          {videoData.comment_analysis && (
            <CommentAnalysis
              analysis={videoData.comment_analysis}
              videoId={videoData.video_info.id}
              onExportSentiment={() => handleExportSection('sentiment')}
              onExportToxicity={() => handleExportSection('toxicity')}
            />
          )}

          {/* Performance Insights */}
          {videoData.performance_insights && (
            <PerformanceInsights insights={videoData.performance_insights} />
          )}
        </div>
      )}
    </div>
  )
}

// Video Overview Component
const VideoOverview = ({ video, engagement, performance, onExport }) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const displayedTags = showAllTags ? video.tags : video.tags.slice(0, 8);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Video Overview</h2>
        <button onClick={onExport} className="btn-secondary text-sm">
          <Download className="w-4 h-4 mr-2" />
          Export Info
        </button>
      </div>

      <div className="flex items-start space-x-6">
        {video.thumbnail_url && (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-32 h-24 rounded-lg object-cover"
          />
        )}

        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{video.title}</h3>
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-youtube-red hover:text-youtube-darkRed"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Channel</p>
              <p className="text-sm font-medium text-gray-900">{video.channel_title}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-sm text-gray-900">{formatRelativeTime(video.published_at)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-sm text-gray-900">{formatDuration(video.duration)}</p>
            </div>

            {performance && (
              <div>
                <p className="text-sm text-gray-600">Performance</p>
                <span className={`text-sm font-medium ${
                  performance.category === 'Excellent' ? 'text-green-600' :
                  performance.category === 'Good' ? 'text-blue-600' :
                  performance.category === 'Average' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {performance.category}
                </span>
              </div>
            )}
          </div>

          {video.tags && video.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {displayedTags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {video.tags.length > 8 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="text-xs text-youtube-red hover:underline flex items-center"
                  >
                    {showAllTags ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" /> Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" /> +{video.tags.length - 8} more
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Video Metrics Component
const VideoMetrics = ({ video, engagement }) => {
  const metrics = [
    {
      label: 'Views',
      value: formatNumber(video?.view_count),
      icon: Eye,
      color: 'text-blue-600'
    },
    {
      label: 'Likes',
      value: formatNumber(video?.like_count),
      icon: ThumbsUp,
      color: 'text-green-600'
    },
    {
      label: 'Comments',
      value: formatNumber(video?.comment_count),
      icon: MessageSquare,
      color: 'text-purple-600'
    },
    {
      label: 'Engagement Rate',
      value: `${engagement?.engagement_rate?.toFixed(2)}%`,
      icon: TrendingUp,
      color: 'text-red-600'
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

// Comment Analysis Component
const CommentAnalysis = ({ analysis, videoId, onExportSentiment, onExportToxicity }) => {
  const [showAllToxicComments, setShowAllToxicComments] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  // State for showing/hiding comments by sentiment type
  const [showAllPositiveComments, setShowAllPositiveComments] = useState(false);
  const [showAllNeutralComments, setShowAllNeutralComments] = useState(false);
  const [showAllNegativeComments, setShowAllNegativeComments] = useState(false);

  // Directly filter toxic comments to only show those with score > 0.6
  const highToxicComments = analysis.toxicity_analysis?.most_toxic_comments?.filter(
    comment => comment.toxicity_score > 0.7
  ) || [];

  const displayedToxicComments = showAllToxicComments
    ? highToxicComments
    : highToxicComments.slice(0, 5);

  const displayedKeywords = showAllKeywords
    ? analysis.keywords
    : analysis.keywords?.slice(0, 10); // Display top 10 keywords initially

  // Access sentiment-specific comments from the new structure
  const topPositiveComments = analysis.sentiment_analysis?.top_positive_comments || [];
  const topNegativeComments = analysis.sentiment_analysis?.top_negative_comments || [];

  // Filter for top neutral comments from all_comments_sentiment
  // This assumes 'all_comments_sentiment' is available and each comment has 'sentiment_label' and 'sentiment_score'
  const allComments = analysis.sentiment_analysis?.all_comments_sentiment || [];
  const topNeutralComments = allComments
    .filter(comment => comment.sentiment_label === 'neutral')
    .sort((a, b) => b.sentiment_score - a.sentiment_score) // Sort by score (descending)
    .slice(0, 10); // Get top 10 neutral comments, adjust as needed

  const displayedPositiveComments = showAllPositiveComments
    ? topPositiveComments
    : topPositiveComments.slice(0, 5);

  const displayedNeutralComments = showAllNeutralComments
    ? topNeutralComments
    : topNeutralComments.slice(0, 5);

  const displayedNegativeComments = showAllNegativeComments
    ? topNegativeComments
    : topNegativeComments.slice(0, 5);

  // --- Helper Component for Comment Lists ---
  const CommentList = ({ title, comments, sentimentType, videoId, showAllState, setShowAllState }) => {
    const iconMap = {
      positive: <Smile className="w-4 h-4 mr-2 text-green-600" />,
      neutral: <Meh className="w-4 h-4 mr-2 text-gray-600" />,
      negative: <Frown className="w-4 h-4 mr-2 text-red-600" />
    };

    const borderColorMap = {
      positive: 'border-green-100',
      neutral: 'border-gray-100',
      negative: 'border-red-100'
    };

    if (!comments || comments.length === 0) {
      return null;
    }

    return (
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
          {iconMap[sentimentType]} {title}
        </h4>
        <ul className="space-y-3">
          {comments.map((comment, index) => (
            <li key={index} className={`p-3 bg-white border ${borderColorMap[sentimentType]} rounded-lg shadow-sm`}>
              <p className="text-sm text-gray-800 line-clamp-2">{comment.text}</p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>By: {comment.author}</span>
                {comment.comment_id && (
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.comment_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-youtube-red hover:underline"
                  >
                    View Comment <ExternalLink className="inline-block w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        {comments.length > 5 && ( // Only show "Show All" if there are more than 5 comments
          <button
            onClick={() => setShowAllState(!showAllState)}
            className="mt-3 text-sm text-youtube-red hover:underline flex items-center"
          >
            {showAllState ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" /> Show All ({comments.length})
              </>
            )}
          </button>
        )}
      </div>
    );
  };
  // --- End Helper Component ---

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analysis?.total_comments)}</p>
            <p className="text-sm text-gray-600">Total Comments</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analysis?.analyzed_comments)}</p>
            <p className="text-sm text-gray-600">Analyzed</p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {((analysis?.analyzed_comments ?? 0) / Math.max(1, analysis?.total_comments ?? 1) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Coverage</p>
          </div>
        </div>

        {/* Sentiment Analysis */}
        {analysis.sentiment_scores && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Sentiment Distribution</h4>
                <button onClick={onExportSentiment} className="btn-secondary text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </button>
              </div>
              <SentimentPieChart
                data={analysis.sentiment_distribution}
                title=""
              />
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Sentiment Metrics</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smile className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Positive</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {((analysis.sentiment_distribution?.positive ?? 0) / Math.max(1, analysis?.analyzed_comments ?? 1) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Meh className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Neutral</span>
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {((analysis.sentiment_distribution?.neutral ?? 0) / Math.max(1, analysis?.analyzed_comments ?? 1) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Frown className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-900">Negative</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    {((analysis.sentiment_distribution?.negative ?? 0) / Math.max(1, analysis?.analyzed_comments ?? 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Top Comments by Sentiment --- */}
        {analysis.sentiment_analysis && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Comments by Sentiment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CommentList
                title="Top Positive Comments"
                comments={displayedPositiveComments}
                sentimentType="positive"
                videoId={videoId}
                showAllState={showAllPositiveComments}
                setShowAllState={setShowAllPositiveComments}
              />
              <CommentList
                title="Top Neutral Comments"
                comments={displayedNeutralComments}
                sentimentType="neutral"
                videoId={videoId}
                showAllState={showAllNeutralComments}
                setShowAllState={setShowAllNeutralComments}
              />
              <CommentList
                title="Top Negative Comments"
                comments={displayedNegativeComments}
                sentimentType="negative"
                videoId={videoId}
                showAllState={showAllNegativeComments}
                setShowAllState={setShowAllNegativeComments}
              />
            </div>
          </div>
        )}
        {/* --- End Top Comments by Sentiment --- */}


        {/* Toxicity Analysis */}
        {analysis.toxicity_analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-200">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Toxicity Analysis</h4>
                <button onClick={onExportToxicity} className="btn-secondary text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-900">Toxic Comments</span>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    {(analysis.toxicity_analysis?.toxic_comments_count ?? 0)} (
                    {(analysis.toxicity_analysis?.toxicity_rate ?? 0).toFixed(1)}%)
                  </span>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Community Health</span>
                    <span className={`text-sm font-bold ${
                      (analysis.toxicity_analysis?.community_health_score?.score ?? 0) >= 80 ? 'text-green-600' :
                      (analysis.toxicity_analysis?.community_health_score?.score ?? 0) >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {(analysis.toxicity_analysis?.community_health_score?.score ?? 0).toFixed(1)}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {analysis.toxicity_analysis?.community_health_score?.level ?? 'N/A'}
                  </p>
                </div>
              </div>

              {/* Most Toxic Comments */}
              {highToxicComments.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Most Toxic Comments
                  </h4>
                  <ul className="space-y-3">
                    {displayedToxicComments.map((comment, index) => (
                      <li key={index} className="p-3 bg-white border border-red-100 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-800 line-clamp-2">{comment.text}</p>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                          <span>By: {comment.author}</span>
                          {comment.comment_id && (
                            <a
                              href={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.comment_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-youtube-red hover:underline"
                            >
                              View Comment <ExternalLink className="inline-block w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {highToxicComments.length > 5 && (
                    <button
                      onClick={() => setShowAllToxicComments(!showAllToxicComments)}
                      className="mt-3 text-sm text-youtube-red hover:underline flex items-center"
                    >
                      {showAllToxicComments ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" /> Show All ({highToxicComments.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Keywords Word Cloud and List */}
            {analysis.keywords && analysis.keywords.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Comment Keywords</h4>
                <KeywordWordCloud
                  keywords={analysis.keywords}
                  title=""
                  height={200}
                />
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Top Keywords List</h5>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {displayedKeywords.map((keyword, index) => (
                      <li key={index} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-b-0">
                        <span>{keyword.keyword}</span>
                        <span className="text-xs text-gray-500">
                          Relevance: {keyword.relevance_score.toFixed(2)} | Occurrences: {keyword.occurrence_count}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {analysis.keywords.length > 10 && (
                    <button
                      onClick={() => setShowAllKeywords(!showAllKeywords)}
                      className="mt-3 text-sm text-youtube-red hover:underline flex items-center"
                    >
                      {showAllKeywords ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" /> Show All ({analysis.keywords.length})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Performance Insights Component
const PerformanceInsights = ({ insights }) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
        <p className="text-2xl font-bold text-gray-900">{(insights?.performance_score ?? 0).toFixed(0)}</p>
        <p className="text-sm text-gray-600">Performance Score</p>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">{insights.duration_category}</p>
        <p className="text-sm text-gray-600">Duration Category</p>
      </div>

      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">{insights.engagement_level}</p>
        <p className="text-sm text-gray-600">Engagement Level</p>
      </div>
    </div>

    {insights.recommendations && insights.recommendations.length > 0 && (
      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Recommendations</h4>
        <ul className="space-y-2">
          {insights.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start space-x-3 text-sm">
              <div className="w-2 h-2 bg-youtube-red rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)

export default VideoPage