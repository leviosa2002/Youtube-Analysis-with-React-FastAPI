import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Youtube,
  Video,
  TrendingUp,
  GitCompare,
  BarChart3,
  Users,
  Clock,
  Download,
  ArrowRight,
  PlayCircle,
  Eye,
  ThumbsUp,
  MessageSquare
} from 'lucide-react'
import { formatNumber, formatRelativeTime } from '../services/utils'
import { healthAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'

const Dashboard = () => {
  const [healthStatus, setHealthStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Quick action cards configuration
  const quickActions = [
    {
      title: 'Channel Analysis',
      description: 'Deep dive into channel metrics, growth trends, and content analysis',
      icon: Youtube,
      href: '/channel',
      color: 'bg-red-500',
      features: ['Subscriber tracking', 'Upload frequency', 'Keyword analysis']
    },
    {
      title: 'Video Analysis',
      description: 'Comprehensive video insights with sentiment and engagement analysis',
      icon: Video,
      href: '/video',
      color: 'bg-blue-500',
      features: ['Comment sentiment', 'Engagement metrics', 'Performance insights']
    },
    {
      title: 'Trending Analysis',
      description: 'Latest trending videos with velocity tracking and category insights',
      icon: TrendingUp,
      href: '/trending',
      color: 'bg-green-500',
      features: ['Real-time trends', 'View velocity', 'Category filters']
    },
    {
      title: 'Comparison Tools',
      description: 'Compare multiple channels or videos side-by-side with detailed metrics',
      icon: GitCompare,
      href: '/comparison',
      color: 'bg-purple-500',
      features: ['Multi-channel compare', 'Performance rankings', 'Competitive analysis']
    }
  ]

  // Feature highlights
  const features = [
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive metrics and insights for YouTube content creators'
    },
    {
      icon: Users,
      title: 'Audience Insights',
      description: 'Understand your audience through comment sentiment and engagement patterns'
    },
    {
      icon: Clock,
      title: 'Real-time Data',
      description: 'Get the latest data directly from YouTube Data API v3'
    },
    {
      icon: Download,
      title: 'Export Reports',
      description: 'Download detailed reports in CSV format for further analysis'
    }
  ]

  // Mock recent activity (in a real app, this would come from user data)
  const recentActivity = [
    {
      type: 'channel',
      title: 'Analyzed MrBeast channel',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      metrics: { subscribers: '224M', videos: 741 }
    },
    {
      type: 'video',
      title: 'Analyzed trending video',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      metrics: { views: '12.5M', engagement: '8.2%' }
    },
    {
      type: 'trending',
      title: 'Checked US trending videos',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      metrics: { videos: 50, categories: 8 }
    }
  ]

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true)
        const health = await healthAPI.checkHealth()
        setHealthStatus(health)
        setError(null)
      } catch (err) {
        setError('Unable to connect to the API. Please check if the backend server is running.')
        console.error('Health check failed:', err)
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          YouTube Analytics Dashboard
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Professional insights and analytics for YouTube channels and videos. 
          Analyze performance, track trends, and understand your audience.
        </p>
      </div>

      {/* API Status */}
      <div className="bg-white rounded-lg shadow-soft p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              loading ? 'bg-yellow-400' : 
              error ? 'bg-red-400' : 
              'bg-green-400'
            }`} />
            <span className="text-sm font-medium text-gray-900">
              API Status: {
                loading ? 'Checking...' :
                error ? 'Disconnected' :
                'Connected'
              }
            </span>
          </div>
          
          {healthStatus && (
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>API Key: {healthStatus.api_key}</span>
              <span>Sessions: {healthStatus.session_count}</span>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-3">
            <ErrorMessage
              title="Connection Error"
              message={error}
              type="warning"
              size="sm"
              onRetry={() => window.location.reload()}
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.title}
              to={action.href}
              className="group card-hover transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-youtube-red transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 mb-3">
                    {action.description}
                  </p>
                  
                  <ul className="space-y-1">
                    {action.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-xs text-gray-500">
                        <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-youtube-red group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Features Grid */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Powerful Analytics Features
          </h2>
          <p className="text-gray-600">
            Everything you need to understand YouTube performance
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="text-center">
                <div className="w-16 h-16 bg-white rounded-lg shadow-soft flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-youtube-red" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Activity & Getting Started */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.type === 'channel' ? 'bg-red-100 text-red-600' :
                  activity.type === 'video' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {activity.type === 'channel' ? <Youtube className="w-4 h-4" /> :
                   activity.type === 'video' ? <PlayCircle className="w-4 h-4" /> :
                   <TrendingUp className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                  <div className="flex space-x-3 mt-1 text-xs text-gray-600">
                    {Object.entries(activity.metrics).map(([key, value]) => (
                      <span key={key}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Activity history is session-based and will reset when you refresh the page
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-youtube-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Analyze a Channel</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Enter a YouTube channel ID or URL to get comprehensive analytics
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-youtube-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Explore Video Insights</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Analyze individual videos for sentiment, engagement, and performance
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-youtube-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Compare & Export</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Compare multiple channels or videos and export detailed reports
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-youtube-red bg-opacity-5 rounded-lg border border-youtube-red border-opacity-20">
            <div className="flex items-center space-x-2 text-youtube-red mb-2">
              <Youtube className="w-4 h-4" />
              <span className="text-sm font-medium">Pro Tip</span>
            </div>
            <p className="text-xs text-gray-700">
              You can analyze any public YouTube channel or video. Use channel URLs, video URLs, 
              or direct IDs. All analysis is performed in real-time using the YouTube Data API.
            </p>
          </div>
        </div>
      </div>

      {/* Sample Data */}
      <div className="card">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Try with Sample Data
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Test the analytics tools with these popular YouTube channels and videos
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/channel"
              state={{ channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA' }}
              className="p-4 border border-gray-200 rounded-lg hover:border-youtube-red hover:bg-red-50 transition-colors group"
            >
              <Youtube className="w-8 h-8 text-youtube-red mx-auto mb-2" />
              <h4 className="font-medium text-gray-900 group-hover:text-youtube-red">MrBeast</h4>
              <p className="text-xs text-gray-500 mt-1">Popular creator channel</p>
            </Link>
            
            <Link
              to="/video"
              state={{ videoId: 'dQw4w9WgXcQ' }}
              className="p-4 border border-gray-200 rounded-lg hover:border-youtube-red hover:bg-red-50 transition-colors group"
            >
              <PlayCircle className="w-8 h-8 text-youtube-red mx-auto mb-2" />
              <h4 className="font-medium text-gray-900 group-hover:text-youtube-red">Sample Video</h4>
              <p className="text-xs text-gray-500 mt-1">Analyze video metrics</p>
            </Link>
            
            <Link
              to="/trending"
              className="p-4 border border-gray-200 rounded-lg hover:border-youtube-red hover:bg-red-50 transition-colors group"
            >
              <TrendingUp className="w-8 h-8 text-youtube-red mx-auto mb-2" />
              <h4 className="font-medium text-gray-900 group-hover:text-youtube-red">Trending Now</h4>
              <p className="text-xs text-gray-500 mt-1">Current trending videos</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard