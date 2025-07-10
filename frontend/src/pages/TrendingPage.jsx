import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Play,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  BarChart3,
  Globe,
  Tag,
  Grid3X3,
  List,
  Search,
  Zap, // For views per hour/day
  Maximize // For duration icon
} from 'lucide-react'

import { useTrendingData, useTrendingFilters } from '../hooks/useTrendingData'
import { formatNumber, formatRelativeTime, truncateText } from '../services/utils' // Assuming these are already defined
import { exportTrendingData } from '../services/csvExport' // Assuming this is already defined

import LoadingSpinner, { DataLoadingSpinner } from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { VelocityLineChart } from '../components/charts/LineChart'
import { CategoryPieChart } from '../components/charts/PieChart' // Changed to PieChart as per your data

// Utility function to format ISO 8601 duration (e.g., "PT1M" to "1m")
// This would ideally be in your utils.js
const formatDuration = (isoDuration) => {
  if (!isoDuration) return 'N/A';
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 'N/A';

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`.trim();
  } else {
    return `${seconds}s`;
  }
};

const TrendingPage = () => {
  const {
    getTrendingVideos,
    trendingData,
    hasData,
    loading,
    error,
    categories, // Categories are available from the hook
    countries,
    canExport,
    exportTrendingAnalysis,
    exportLoading,
    retryAnalysis
  } = useTrendingData()

  const {
    selectedCountry,
    selectedCategory,
    maxResults,
    sortBy,
    sortDirection,
    searchQuery,
    viewMode,
    updateFilter,
    updateFilters,
    resetFilters,
    getAPIFilters,
    filterAndSortVideos
  } = useTrendingFilters()

  const [showFilters, setShowFilters] = useState(false)

  // Auto-fetch trending videos on mount
  useEffect(() => {
    if (!hasData && !loading) {
      handleFetchTrending()
    }
  }, [])

  const handleFetchTrending = async () => {
    const filters = getAPIFilters()
    await getTrendingVideos(filters)
  }

  const handleExport = async () => {
    if (!canExport || !trendingData) return

    try {
      await exportTrendingAnalysis(
        selectedCountry,
        selectedCategory,
        maxResults,
        trendingData.session_id
      )
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleExportSection = (section) => {
    if (!trendingData) return

    switch (section) {
      case 'videos':
        exportTrendingData.trendingVideos(trendingData.videos, selectedCountry)
        break
      case 'velocity':
        if (trendingData.velocity_data) {
          exportTrendingData.velocityData(trendingData.velocity_data, selectedCountry)
        }
        break
    }
  }

  // Filter and sort videos for display and merge velocity data
  const processedVideos = hasData && trendingData ?
    filterAndSortVideos(trendingData.videos).map(video => {
      // Find corresponding velocity data for the video
      const velocity = trendingData.velocity_data?.find(v => v.video_id === video.id);
      // Find corresponding category name
      const categoryName = categories?.find(cat => cat.id === video.category_id)?.name || 'N/A';
      return {
        ...video,
        ...velocity, // Merge velocity data if found
        category_name: categoryName, // Add category name for display
        duration_formatted: formatDuration(video.duration) // Add formatted duration
      };
    }) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trending Analysis</h1>
          <p className="text-gray-600 mt-1">
            Discover what's trending on YouTube with real-time analytics and insights
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>

          {hasData && (
            <>
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
                {exportLoading ? 'Exporting...' : 'Export'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <FiltersPanel
          countries={countries}
          categories={categories}
          selectedCountry={selectedCountry}
          selectedCategory={selectedCategory}
          maxResults={maxResults}
          onUpdateFilter={updateFilter}
          onUpdateFilters={updateFilters}
          onResetFilters={resetFilters}
          onApplyFilters={handleFetchTrending}
          loading={loading}
        />
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleFetchTrending}
              disabled={loading}
              className="btn-primary"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {loading ? 'Fetching...' : 'Get Trending Videos'}
            </button>

            <div className="text-sm text-gray-500">
              {hasData && trendingData && (
                <span>
                  Showing trending videos for **{trendingData.country}**
                  {trendingData.category_filter && ` in **${categories?.find(c => c.id === trendingData.category_filter)?.name}**`}
                </span>
              )}
            </div>
          </div>

          {hasData && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateFilter('viewMode', 'grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-youtube-red text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateFilter('viewMode', 'list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-youtube-red text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <DataLoadingSpinner text="Fetching trending videos and analyzing data..." />
      )}

      {/* Error State */}
      {error && (
        <ErrorMessage
          title="Failed to Fetch Trending Videos"
          message={error}
          onRetry={retryAnalysis}
        />
      )}

      {/* Results */}
      {hasData && trendingData && (
        <div className="space-y-6">
          {/* Stats Overview */}
          <TrendingStats data={trendingData} />

          {/* Charts and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* View Velocity Chart */}
            {trendingData.velocity_data && trendingData.velocity_data.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">View Velocity (Top 10)</h3>
                  <button
                    onClick={() => handleExportSection('velocity')}
                    className="btn-secondary text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                </div>
                <VelocityLineChart
                  data={trendingData.velocity_data.slice(0, 10)} // Slice to ensure only top 10 as per data
                  title=""
                />
              </div>
            )}

            {/* Category Distribution */}
            {trendingData.category_distribution && (
              <CategoryPieChart
                data={trendingData.category_distribution}
                title="Category Distribution"
              />
            )}
          </div>

          {/* Search and Sort */}
          <SearchAndSort
            searchQuery={searchQuery}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onUpdateFilter={updateFilter}
            videosCount={processedVideos.length}
            totalVideos={trendingData.videos.length}
          />

          {/* Videos List/Grid */}
          <VideosDisplay
            videos={processedVideos}
            viewMode={viewMode}
            onExport={() => handleExportSection('videos')}
          />
        </div>
      )}
    </div>
  )
}

// Filters Panel Component (No changes needed here)
const FiltersPanel = ({
  countries,
  categories,
  selectedCountry,
  selectedCategory,
  maxResults,
  onUpdateFilter,
  onUpdateFilters,
  onResetFilters,
  onApplyFilters,
  loading
}) => (
  <div className="card">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Options</h3>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Globe className="w-4 h-4 inline mr-1" />
          Country
        </label>
        <select
          value={selectedCountry}
          onChange={(e) => onUpdateFilter('selectedCountry', e.target.value)}
          className="input-field"
        >
          {countries && countries.map(country => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          Category
        </label>
        <select
          value={selectedCategory || ''}
          onChange={(e) => onUpdateFilter('selectedCategory', e.target.value || null)}
          className="input-field"
        >
          <option value="">All Categories</option>
          {categories && categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <BarChart3 className="w-4 h-4 inline mr-1" />
          Max Results
        </label>
        <select
          value={maxResults}
          onChange={(e) => onUpdateFilter('maxResults', parseInt(e.target.value))}
          className="input-field"
        >
          <option value={25}>25 videos</option>
          <option value={50}>50 videos</option>
        </select>
      </div>
    </div>

    <div className="flex space-x-3">
      <button
        onClick={onApplyFilters}
        disabled={loading}
        className="btn-primary"
      >
        Apply Filters
      </button>

      <button
        onClick={onResetFilters}
        className="btn-secondary"
      >
        Reset
      </button>
    </div>
  </div>
)

// Trending Stats Component (No changes needed here)
const TrendingStats = ({ data }) => {
  const totalViews = data.videos.reduce((sum, video) => sum + video.view_count, 0)
  const totalLikes = data.videos.reduce((sum, video) => sum + video.like_count, 0)
  const totalComments = data.videos.reduce((sum, video) => sum + video.comment_count, 0)
  const avgEngagement = data.videos.reduce((sum, video) => sum + video.engagement_rate, 0) / data.videos.length

  const stats = [
    {
      label: 'Total Videos',
      value: formatNumber(data.videos.length),
      icon: Play,
      color: 'text-blue-600'
    },
    {
      label: 'Total Views',
      value: formatNumber(totalViews),
      icon: Eye,
      color: 'text-green-600'
    },
    {
      label: 'Total Likes',
      value: formatNumber(totalLikes),
      icon: ThumbsUp,
      color: 'text-red-600'
    },
    {
      label: 'Avg Engagement',
      value: `${avgEngagement.toFixed(2)}%`,
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="metric-value">{stat.value}</p>
            <p className="metric-label">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}

// Search and Sort Component (No changes needed here)
const SearchAndSort = ({
  searchQuery,
  sortBy,
  sortDirection,
  onUpdateFilter,
  videosCount,
  totalVideos
}) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => onUpdateFilter('searchQuery', e.target.value)}
            className="input-field pl-10 w-64"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <select
          value={sortBy}
          onChange={(e) => onUpdateFilter('sortBy', e.target.value)}
          className="input-field w-auto"
        >
          <option value="view_count">Sort by Views</option>
          <option value="like_count">Sort by Likes</option>
          <option value="comment_count">Sort by Comments</option>
          <option value="engagement_rate">Sort by Engagement</option>
          <option value="published_at">Sort by Date</option>
        </select>

        <button
          onClick={() => onUpdateFilter('sortDirection', sortDirection === 'asc' ? 'desc' : 'asc')}
          className="btn-secondary"
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="text-sm text-gray-500">
        Showing {videosCount} of {totalVideos} videos
      </div>
    </div>
  </div>
)

// Videos Display Component (WITH ENHANCEMENTS)
const VideosDisplay = ({ videos, viewMode, onExport }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Trending Videos
      </h3>
      <button onClick={onExport} className="btn-secondary text-sm">
        <Download className="w-4 h-4 mr-2" />
        Export Videos
      </button>
    </div>

    {viewMode === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="table ">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">Video</th>
              <th className="table-header-cell">Channel</th>
              <th className="table-header-cell">Views</th>
              <th className="table-header-cell">Likes</th>
              <th className="table-header-cell">Comments</th>
              <th className="table-header-cell">Published</th>
              <th className="table-header-cell">Duration</th> {/* Added Duration */}
              <th className="table-header-cell">Views/Hour</th> {/* Added Views/Hour */}
              <th className="table-header-cell">Views/Day</th> {/* Added Views/Day */}
              <th className="table-header-cell">Category</th> {/* Added Category */}
              <th className="table-header-cell">Engagement</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {videos.map((video) => (
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
                    <div className="min-w-0 flex-1">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-youtube-red hover:text-youtube-darkRed font-medium"
                      >
                        {truncateText(video.title, 50)}
                      </a>
                    </div>
                  </div>
                </td>
                <td className="table-cell">{truncateText(video.channel_title, 20)}</td>
                <td className="table-cell">{formatNumber(video.view_count)}</td>
                <td className="table-cell">{formatNumber(video.like_count)}</td>
                <td className="table-cell">{formatNumber(video.comment_count)}</td>
                <td className="table-cell text-gray-500">
                  {formatRelativeTime(video.published_at)}
                </td>
                <td className="table-cell">{video.duration_formatted}</td> {/* Display Duration */}
                <td className="table-cell">{video.views_per_hour ? formatNumber(video.views_per_hour.toFixed(0)) : 'N/A'}</td> {/* Display Views/Hour */}
                <td className="table-cell">{video.views_per_day ? formatNumber(video.views_per_day.toFixed(0)) : 'N/A'}</td> {/* Display Views/Day */}
                <td className="table-cell">{video.category_name}</td> {/* Display Category */}
                <td className="table-cell">
                  <span className={`badge ${
                    video.engagement_rate >= 5 ? 'badge-success' :
                    video.engagement_rate >= 2 ? 'badge-warning' :
                    'badge-error'
                  }`}>
                    {(video.engagement_rate ?? 0).toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {videos.length === 0 && (
      <div className="text-center py-8 text-gray-500">
        <p>No videos found matching your criteria.</p>
        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
      </div>
    )}
  </div>
)

// Video Card Component for Grid View (WITH ENHANCEMENTS)
const VideoCard = ({ video }) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
    {video.thumbnail_url && (
      <img
        src={video.thumbnail_url}
        alt=""
        className="w-full h-48 object-cover"
      />
    )}

    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
          {video.title}
        </h4>
        <a
          href={`https://www.youtube.com/watch?v=${video.id}`} 
          target="_blank"
          rel="noopener noreferrer"
          className="text-youtube-red hover:text-youtube-darkRed ml-2"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <p className="text-xs text-gray-600 mb-3">{video.channel_title}</p>
      <p className="text-xs text-gray-500 mb-2">
        **Category:** {video.category_name} {/* Display Category */}
      </p>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div className="flex items-center">
          <Eye className="w-3 h-3 mr-1" />
          {formatNumber(video.view_count)}
        </div>
        <div className="flex items-center">
          <ThumbsUp className="w-3 h-3 mr-1" />
          {formatNumber(video.like_count)}
        </div>
        <div className="flex items-center">
          <MessageSquare className="w-3 h-3 mr-1" />
          {formatNumber(video.comment_count)}
        </div>
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {formatRelativeTime(video.published_at)}
        </div>
        <div className="flex items-center">
          <Maximize className="w-3 h-3 mr-1" /> {/* Icon for duration */}
          {video.duration_formatted} {/* Display Duration */}
        </div>
        <div className="flex items-center">
          <Zap className="w-3 h-3 mr-1" /> {/* Icon for velocity */}
          {video.views_per_hour ? `${formatNumber(video.views_per_hour.toFixed(0))}/hr` : 'N/A'} {/* Display Views/Hour */}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Engagement</span>
          <span className={`text-xs font-medium ${
            (video.engagement_rate ?? 0) >= 5 ? 'text-green-600' :
            (video.engagement_rate ?? 0) >= 2 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {(video.engagement_rate ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  </div>
)

export default TrendingPage