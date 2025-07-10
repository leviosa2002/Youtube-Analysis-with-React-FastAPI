import React from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { formatNumber, formatDate } from '../../services/utils'

const LineChart = ({
  data = [],
  xDataKey = 'date',
  yDataKey = 'value',
  lines = [],
  title = '',
  subtitle = '',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669'],
  formatXAxis = null,
  formatYAxis = null,
  className = ''
}) => {
  // Default line configuration if no lines provided
  const defaultLines = lines.length > 0 ? lines : [
    {
      dataKey: yDataKey,
      name: 'Value',
      color: colors[0],
      strokeWidth: 2
    }
  ]

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {formatXAxis ? formatXAxis(label) : formatDate(label)}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {formatYAxis ? formatYAxis(entry.value) : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Custom X-axis tick formatter
  const formatXAxisTick = (value) => {
    if (formatXAxis) return formatXAxis(value)
    
    // Default date formatting
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return value
      return formatDate(date, 'MMM dd')
    } catch {
      return value
    }
  }

  // Custom Y-axis tick formatter
  const formatYAxisTick = (value) => {
    if (formatYAxis) return formatYAxis(value)
    return formatNumber(value)
  }

  if (!data || data.length === 0) {
    return (
      <div className={`card ${className}`}>
        {title && (
          <div className="mb-4">
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
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f3f4f6"
              strokeOpacity={0.8}
            />
          )}
          
          <XAxis
            dataKey={xDataKey}
            tickFormatter={formatXAxisTick}
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis
            tickFormatter={formatYAxisTick}
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
          )}
          
          {defaultLines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || colors[index % colors.length]}
              strokeWidth={line.strokeWidth || 2}
              dot={line.showDots !== false ? {
                fill: line.color || colors[index % colors.length],
                strokeWidth: 2,
                r: 4
              } : false}
              activeDot={line.showActiveDot !== false ? {
                r: 6,
                stroke: line.color || colors[index % colors.length],
                strokeWidth: 2,
                fill: '#fff'
              } : false}
              connectNulls={line.connectNulls !== false}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Growth Line Chart for channel analytics
export const GrowthLineChart = ({ data, title = "Channel Growth Over Time" }) => {
  const lines = [
    {
      dataKey: 'cumulative_views',
      name: 'Total Views',
      color: '#dc2626',
      strokeWidth: 3
    },
    {
      dataKey: 'video_count',
      name: 'Video Count',
      color: '#2563eb',
      strokeWidth: 2
    }
  ]

  return (
    <LineChart
      data={data}
      xDataKey="date"
      lines={lines}
      title={title}
      height={350}
      formatYAxis={(value) => formatNumber(value)}
    />
  )
}

// Engagement Line Chart
export const EngagementLineChart = ({ data, title = "Engagement Over Time" }) => {
  const lines = [
    {
      dataKey: 'like_rate',
      name: 'Like Rate (%)',
      color: '#10b981',
      strokeWidth: 2
    },
    {
      dataKey: 'comment_rate',
      name: 'Comment Rate (%)',
      color: '#f59e0b',
      strokeWidth: 2
    },
    {
      dataKey: 'engagement_rate',
      name: 'Total Engagement (%)',
      color: '#dc2626',
      strokeWidth: 3
    }
  ]

  return (
    <LineChart
      data={data}
      xDataKey="date"
      lines={lines}
      title={title}
      height={300}
      formatYAxis={(value) => `${value.toFixed(2)}%`}
    />
  )
}

// Velocity Line Chart for trending videos
export const VelocityLineChart = ({ data, title = "View Velocity" }) => {
  return (
    <LineChart
      data={data}
      xDataKey="hours_since_publish"
      yDataKey="views_per_hour"
      title={title}
      height={250}
      formatXAxis={(value) => `${Math.round(value)}h`}
      formatYAxis={(value) => `${formatNumber(value)}/hr`}
      colors={['#8b5cf6']}
    />
  )
}

// Sentiment Line Chart
export const SentimentLineChart = ({ data, title = "Sentiment Trends" }) => {
  const lines = [
    {
      dataKey: 'positive_ratio',
      name: 'Positive',
      color: '#10b981',
      strokeWidth: 2
    },
    {
      dataKey: 'negative_ratio',
      name: 'Negative',
      color: '#ef4444',
      strokeWidth: 2
    },
    {
      dataKey: 'neutral_ratio',
      name: 'Neutral',
      color: '#6b7280',
      strokeWidth: 2
    }
  ]

  return (
    <LineChart
      data={data}
      xDataKey="timestamp"
      lines={lines}
      title={title}
      height={300}
      formatXAxis={(timestamp) => formatDate(new Date(timestamp * 1000), 'HH:mm')}
      formatYAxis={(value) => `${(value * 100).toFixed(1)}%`}
    />
  )
}

export default LineChart