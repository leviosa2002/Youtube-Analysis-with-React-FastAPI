import React from 'react'
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { formatNumber, truncateText } from '../../services/utils'

const RadarChart = ({
  data = [],
  dataKeys = [],
  title = '',
  subtitle = '',
  height = 300,
  showLegend = true,
  showTooltip = true,
  colors = ['#dc2626', '#2563eb', '#059669', '#d97706', '#8b5cf6'],
  fillOpacity = 0.1,
  strokeWidth = 2,
  className = ''
}) => {
  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={`card ${className}`}>
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Chart will appear when data is loaded</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            className="text-xs"
          />
          
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'dataMax']}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={5}
          />
          
          {dataKeys.map((dataKey, index) => (
            <Radar
              key={dataKey}
              name={dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}
              dataKey={dataKey}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={fillOpacity}
              strokeWidth={strokeWidth}
            />
          ))}
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Channel Comparison Radar Chart
export const ChannelComparisonRadar = ({ channels, title = "Channel Performance Comparison" }) => {
  if (!channels || channels.length === 0) return null

  // Normalize data for radar chart (0-100 scale)
  const metrics = ['subscribers', 'totalViews', 'videoCount', 'avgViews', 'engagement']
  
  // Find max values for normalization
  const maxValues = {
    subscribers: Math.max(...channels.map(ch => ch.subscriber_count || 0)),
    totalViews: Math.max(...channels.map(ch => ch.view_count || 0)),
    videoCount: Math.max(...channels.map(ch => ch.video_count || 0)),
    avgViews: Math.max(...channels.map(ch => (ch.view_count || 0) / Math.max(1, ch.video_count || 1))),
    engagement: Math.max(...channels.map(ch => ch.engagement_rate || 0))
  }

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'Subscribers',
      ...channels.reduce((acc, channel, index) => {
        const channelName = truncateText(channel.title, 15)
        acc[channelName] = (channel.subscriber_count || 0) / maxValues.subscribers * 100
        return acc
      }, {})
    },
    {
      metric: 'Total Views',
      ...channels.reduce((acc, channel, index) => {
        const channelName = truncateText(channel.title, 15)
        acc[channelName] = (channel.view_count || 0) / maxValues.totalViews * 100
        return acc
      }, {})
    },
    {
      metric: 'Video Count',
      ...channels.reduce((acc, channel, index) => {
        const channelName = truncateText(channel.title, 15)
        acc[channelName] = (channel.video_count || 0) / maxValues.videoCount * 100
        return acc
      }, {})
    },
    {
      metric: 'Avg Views',
      ...channels.reduce((acc, channel, index) => {
        const channelName = truncateText(channel.title, 15)
        const avgViews = (channel.view_count || 0) / Math.max(1, channel.video_count || 1)
        acc[channelName] = avgViews / maxValues.avgViews * 100
        return acc
      }, {})
    },
    {
      metric: 'Engagement',
      ...channels.reduce((acc, channel, index) => {
        const channelName = truncateText(channel.title, 15)
        acc[channelName] = (channel.engagement_rate || 0) / Math.max(maxValues.engagement, 1) * 100
        return acc
      }, {})
    }
  ]

  const dataKeys = channels.map(ch => truncateText(ch.title, 15))

  return (
    <RadarChart
      data={radarData}
      dataKeys={dataKeys}
      title={title}
      height={350}
    />
  )
}

// Video Performance Radar Chart
export const VideoPerformanceRadar = ({ videos, title = "Video Performance Analysis" }) => {
  if (!videos || videos.length === 0) return null

  // Find max values for normalization
  const maxValues = {
    views: Math.max(...videos.map(v => v.view_count || 0)),
    likes: Math.max(...videos.map(v => v.like_count || 0)),
    comments: Math.max(...videos.map(v => v.comment_count || 0)),
    engagement: Math.max(...videos.map(v => v.engagement_rate || 0)),
    duration: Math.max(...videos.map(v => v.duration_seconds || 0))
  }

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'Views',
      ...videos.reduce((acc, video, index) => {
        const videoName = truncateText(video.title, 15)
        acc[videoName] = (video.view_count || 0) / maxValues.views * 100
        return acc
      }, {})
    },
    {
      metric: 'Likes',
      ...videos.reduce((acc, video, index) => {
        const videoName = truncateText(video.title, 15)
        acc[videoName] = (video.like_count || 0) / maxValues.likes * 100
        return acc
      }, {})
    },
    {
      metric: 'Comments',
      ...videos.reduce((acc, video, index) => {
        const videoName = truncateText(video.title, 15)
        acc[videoName] = (video.comment_count || 0) / maxValues.comments * 100
        return acc
      }, {})
    },
    {
      metric: 'Engagement',
      ...videos.reduce((acc, video, index) => {
        const videoName = truncateText(video.title, 15)
        acc[videoName] = (video.engagement_rate || 0) / Math.max(maxValues.engagement, 1) * 100
        return acc
      }, {})
    },
    {
      metric: 'Duration',
      ...videos.reduce((acc, video, index) => {
        const videoName = truncateText(video.title, 15)
        acc[videoName] = (video.duration_seconds || 0) / maxValues.duration * 100
        return acc
      }, {})
    }
  ]

  const dataKeys = videos.map(v => truncateText(v.title, 15))

  return (
    <RadarChart
      data={radarData}
      dataKeys={dataKeys}
      title={title}
      height={350}
    />
  )
}

// Content Quality Radar Chart
export const ContentQualityRadar = ({ data, title = "Content Quality Analysis" }) => {
  const qualityData = [
    {
      metric: 'Engagement Rate',
      score: Math.min(100, (data.engagement_rate || 0) * 20) // Scale 0-5% to 0-100
    },
    {
      metric: 'Like Ratio',
      score: Math.min(100, (data.like_ratio || 0) * 25) // Scale 0-4% to 0-100
    },
    {
      metric: 'Comment Ratio',
      score: Math.min(100, (data.comment_ratio || 0) * 100) // Scale 0-1% to 0-100
    },
    {
      metric: 'View Velocity',
      score: Math.min(100, (data.view_velocity || 0) / 1000 * 100) // Normalize view velocity
    },
    {
      metric: 'Sentiment Score',
      score: Math.max(0, (data.sentiment_score || 0) + 1) * 50 // Scale -1 to 1 to 0-100
    }
  ]

  return (
    <RadarChart
      data={qualityData}
      dataKeys={['score']}
      title={title}
      height={300}
      colors={['#059669']}
    />
  )
}

// Community Health Radar Chart
export const CommunityHealthRadar = ({ data, title = "Community Health Analysis" }) => {
  const healthData = [
    {
      metric: 'Engagement',
      health: Math.min(100, (data.engagement_rate || 0) * 10)
    },
    {
      metric: 'Sentiment',
      health: Math.max(0, Math.min(100, ((data.positive_sentiment || 0) - (data.negative_sentiment || 0)) * 100 + 50))
    },
    {
      metric: 'Activity',
      health: Math.min(100, (data.comment_count || 0) / Math.max(1, data.view_count || 1) * 10000)
    },
    {
      metric: 'Safety',
      health: Math.max(0, 100 - (data.toxicity_rate || 0))
    },
    {
      metric: 'Growth',
      health: Math.min(100, Math.max(0, (data.growth_rate || 0) * 10 + 50))
    }
  ]

  return (
    <RadarChart
      data={healthData}
      dataKeys={['health']}
      title={title}
      height={300}
      colors={['#3b82f6']}
      fillOpacity={0.2}
    />
  )
}

export default RadarChart