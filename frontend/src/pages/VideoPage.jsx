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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Star,
  Target,
  Activity,
  Zap
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
      case 'performance':
        if (videoData.performance_insights) {
          exportVideoData.performanceInsights(videoData.performance_insights, videoData.video_info.id)
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
            <PerformanceInsights 
              insights={videoData.performance_insights}
              onExport={() => handleExportSection('performance')}
            />
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

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" />
            </button>
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                    <MoreHorizontal className="h-5 w-5" />
                  </span>
                ) : (
                  <button
                    onClick={() => onPageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                      currentPage === page
                        ? 'z-10 bg-youtube-red text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-youtube-red'
                        : 'text-gray-900'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Enhanced Comment Analysis Component with Pagination
const CommentAnalysis = ({ analysis, videoId, onExportSentiment, onExportToxicity }) => {
  // Pagination states for different comment sections
  const [toxicCommentsPage, setToxicCommentsPage] = useState(1);
  const [positiveCommentsPage, setPositiveCommentsPage] = useState(1);
  const [neutralCommentsPage, setNeutralCommentsPage] = useState(1);
  const [negativeCommentsPage, setNegativeCommentsPage] = useState(1);
  const [keywordsPage, setKeywordsPage] = useState(1); 
  
  // Items per page
  const commentsPerPage = 10;
  const keywordsPerPage = 15;

  // State for showing different comment sections
  const [activeTab, setActiveTab] = useState('all'); // Set default to 'all'
  const [allCommentsPage, setAllCommentsPage] = useState(1);

  // Filter and prepare data
  const highToxicComments = analysis.toxicity_analysis?.most_toxic_comments?.filter(
    comment => comment.toxicity_score > 0.6
  ) || [];

  // Access sentiment-specific comments
  const topPositiveComments = analysis.sentiment_analysis?.top_positive_comments || [];
  const topNegativeComments = analysis.sentiment_analysis?.top_negative_comments || [];
  
  // Filter for neutral comments
  const allComments = analysis.sentiment_analysis?.all_comments_sentiment || [];
  const positiveComments = allComments.filter(comment => comment.sentiment_label === 'positive');
  const neutralComments = allComments.filter(comment => comment.sentiment_label === 'neutral');
  const negativeComments = allComments.filter(comment => comment.sentiment_label === 'negative');

  const topNeutralComments = allComments
    .filter(comment => comment.sentiment_label === 'neutral')
    .sort((a, b) => b.sentiment_score - a.sentiment_score);

  // Pagination calculations
  const getTotalPages = (items, itemsPerPage) => Math.ceil(items.length / itemsPerPage);
  const getPaginatedItems = (items, page, itemsPerPage) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  // Comment List Component with Pagination
  const PaginatedCommentList = ({ 
    title, 
    comments, 
    sentimentType, 
    videoId, 
    currentPage, 
    onPageChange,
    totalItems 
  }) => {
    const iconMap = {
      positive: <Smile className="w-4 h-4 mr-2 text-green-600" />,
      neutral: <Meh className="w-4 h-4 mr-2 text-gray-600" />,
      negative: <Frown className="w-4 h-4 mr-2 text-red-600" />,
      toxic: <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
    };

    const borderColorMap = {
      positive: 'border-green-100',
      neutral: 'border-gray-100',
      negative: 'border-red-100',
      toxic: 'border-red-200',
      all: 'border-gray-100'
    };

    if (!comments || comments.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No {sentimentType} comments found</p>
        </div>
      );
    }

    const totalPages = getTotalPages(comments, commentsPerPage);
    const displayedComments = getPaginatedItems(comments, currentPage, commentsPerPage);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 flex items-center">
            {iconMap[sentimentType]} {title} ({formatNumber(totalItems || comments.length)})
          </h4>
        </div>
        
        <div className="space-y-3">
          {displayedComments.map((comment, index) => (
            <div key={comment.comment_id || index} className={`p-4 bg-white border ${borderColorMap[sentimentType]} rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
              <p className="text-sm text-gray-800 mb-3 leading-relaxed">{comment.text}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>By: <span className="font-medium">{comment.author}</span></span>
                  {comment.like_count > 0 && (
                    <span className="flex items-center">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      {formatNumber(comment.like_count)}
                    </span>
                  )}
                  {comment.published_at && (
                    <span>{formatRelativeTime(comment.published_at)}</span>
                  )}
                </div>
                {comment.comment_id && (
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.comment_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-youtube-red hover:underline flex items-center"
                  >
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
              {comment.toxicity_score && (
                <div className="mt-2 flex items-center text-xs">
                  <span className="text-red-600">Toxicity: {(comment.toxicity_score * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={comments.length}
            itemsPerPage={commentsPerPage}
          />
        )}
      </div>
    );
  };

// Keywords List with Pagination
  const PaginatedKeywordsList = ({ keywords }) => {
    if (!keywords || keywords.length === 0) return null;

    const totalPages = getTotalPages(keywords, keywordsPerPage);
    const displayedKeywords = getPaginatedItems(keywords, keywordsPage, keywordsPerPage);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-sm font-medium text-gray-900">
            Top Keywords ({formatNumber(keywords.length)})
          </h5>
        </div>
        
        <div className="space-y-3">
          {displayedKeywords.map((keyword, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-900">{keyword.keyword}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {keyword.ngram_size === 1 ? 'Word' : 'Phrase'}
                </span>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>Relevance: {keyword.relevance_score.toFixed(2)}</div>
                <div>Count: {keyword.occurrence_count}</div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={keywordsPage}
            totalPages={totalPages}
            onPageChange={setKeywordsPage}
            totalItems={keywords.length}
            itemsPerPage={keywordsPerPage}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment Analysis</h3>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {analysis?.toxicity_analysis?.toxic_comments_count ?? 0}
            </p>
            <p className="text-sm text-gray-600">Toxic Comments</p>
          </div>
        </div>

        {/* Sentiment Analysis Charts */}
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
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Total Analyzed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-600">
                      {formatNumber(analysis?.analyzed_comments ?? 0)}
                    </span>
                    <p className="text-xs text-gray-500">
                      Comments Analyzed
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smile className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Positive</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-green-600">
                      {formatNumber(analysis.sentiment_distribution?.positive ?? 0)}
                    </span>
                    <p className="text-xs text-gray-500">
                      {((analysis.sentiment_distribution?.positive ?? 0) / Math.max(1, analysis?.analyzed_comments ?? 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Meh className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Neutral</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-600">
                      {formatNumber(analysis.sentiment_distribution?.neutral ?? 0)}
                    </span>
                    <p className="text-xs text-gray-500">
                      {((analysis.sentiment_distribution?.neutral ?? 0) / Math.max(1, analysis?.analyzed_comments ?? 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Frown className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-900">Negative</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">
                      {formatNumber(analysis.sentiment_distribution?.negative ?? 0)}
                    </span>
                    <p className="text-xs text-gray-500">
                      {((analysis.sentiment_distribution?.negative ?? 0) / Math.max(1, analysis?.analyzed_comments ?? 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
                {[
                    { id: 'all', label: 'All Comments', count: allComments.length, icon: MessageSquare },
                    { id: 'positive', label: 'Positive', count: positiveComments.length, icon: Smile },
                    { id: 'neutral', label: 'Neutral', count: neutralComments.length, icon: Meh },
                    { id: 'negative', label: 'Negative', count: negativeComments.length, icon: Frown },
                    { id: 'toxicity', label: 'Toxicity Analysis', count: analysis?.toxicity_analysis?.toxic_comments_count, icon: AlertTriangle },
                    { id: 'keywords', label: 'Keywords', count: analysis?.keywords?.length, icon: Hash }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                            activeTab === tab.id
                                ? 'border-youtube-red text-youtube-red'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                {formatNumber(tab.count)}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'all' && (
        <PaginatedCommentList
            title="All Comments"
            comments={allComments}
            sentimentType="all"
            videoId={videoId}
            currentPage={allCommentsPage}
            onPageChange={setAllCommentsPage}
            totalItems={allComments.length}
        />
    )}

    {activeTab === 'positive' && (
        <PaginatedCommentList
            title="Positive Comments"
            comments={positiveComments}
            sentimentType="positive"
            videoId={videoId}
            currentPage={positiveCommentsPage}
            onPageChange={setPositiveCommentsPage}
            totalItems={positiveComments.length}
        />
    )}

    {activeTab === 'neutral' && (
        <PaginatedCommentList
            title="Neutral Comments"
            comments={neutralComments}
            sentimentType="neutral"
            videoId={videoId}
            currentPage={neutralCommentsPage}
            onPageChange={setNeutralCommentsPage}
            totalItems={neutralComments.length}
        />
    )}

    {activeTab === 'negative' && (
        <PaginatedCommentList
            title="Negative Comments"
            comments={negativeComments}
            sentimentType="negative"
            videoId={videoId}
            currentPage={negativeCommentsPage}
            onPageChange={setNegativeCommentsPage}
            totalItems={negativeComments.length}
        />
    )}

          {activeTab === 'toxicity' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Toxicity Overview</h4>
                  <button onClick={onExportToxicity} className="btn-secondary text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-lg font-bold text-red-600">
                          {(analysis.toxicity_analysis?.toxicity_rate ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Toxicity Rate</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span className={`text-lg font-bold ${
                          (analysis.toxicity_analysis?.community_health_score?.score ?? 0) >= 80 ? 'text-green-600' :
                          (analysis.toxicity_analysis?.community_health_score?.score ?? 0) >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(analysis.toxicity_analysis?.community_health_score?.score ?? 0).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Health Score</p>
                    </div>
                  </div>

                  {/* Toxicity Levels */}
                  {analysis.toxicity_analysis?.toxicity_levels && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-900">Toxicity Levels</h5>
                      {Object.entries(analysis.toxicity_analysis.toxicity_levels).map(([level, count]) => (
                        <div key={level} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm capitalize text-gray-700">{level} Toxicity</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toxicity Types */}
                  {analysis.toxicity_analysis?.toxicity_type_distribution && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-900">Toxicity Types</h5>
                      {Object.entries(analysis.toxicity_analysis.toxicity_type_distribution).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm capitalize text-gray-700">{type.replace('_', ' ')}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <PaginatedCommentList
                  title="Most Toxic Comments"
                  comments={highToxicComments}
                  sentimentType="toxic"
                  videoId={videoId}
                  currentPage={toxicCommentsPage}
                  onPageChange={setToxicCommentsPage}
                  totalItems={highToxicComments.length}
                />
              </div>
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Keywords Word Cloud</h4>
                {analysis.keywords && analysis.keywords.length > 0 ? (
                  <KeywordWordCloud
                    keywords={analysis.keywords}
                    title=""
                    height={300}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No keywords found</p>
                  </div>
                )}
              </div>
              <div>
                <PaginatedKeywordsList keywords={analysis.keywords} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoPage