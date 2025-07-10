import React from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { formatNumber, formatPercent, truncateText } from '../../services/utils'

const PieChart = ({
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  title = '',
  subtitle = '',
  height = 300,
  showLegend = true,
  showTooltip = true,
  showLabels = false,
  colors = [
    '#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669',
    '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#db2777'
  ],
  innerRadius = 0,
  outerRadius = 80,
  formatValue = null,
  className = ''
}) => {
  // Calculate total for percentage calculations
  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0)

  // Add percentage to data
  const enrichedData = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item[valueKey] || 0) / total * 100) : 0
  }))

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {data[nameKey]}
        </p>
        <div className="flex items-center space-x-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          />
          <span className="text-gray-600">Value:</span>
          <span className="font-medium text-gray-900">
            {formatValue ? formatValue(data[valueKey]) : formatNumber(data[valueKey])}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm mt-1">
          <div className="w-3 h-3" />
          <span className="text-gray-600">Percentage:</span>
          <span className="font-medium text-gray-900">
            {formatPercent(data.percentage)}
          </span>
        </div>
      </div>
    )
  }

  // Custom label formatter
  const renderLabel = (entry) => {
    if (!showLabels) return null
    return `${entry.percentage.toFixed(1)}%`
  }

  // Custom legend formatter
  const renderLegend = (props) => {
    if (!showLegend) return null

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {props.payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">
              {truncateText(entry.value, 20)}
            </span>
            <span className="text-gray-500">
              ({formatNumber(enrichedData[index]?.[valueKey])})
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
        <RechartsPieChart>
          <Pie
            data={enrichedData}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            labelLine={false}
            label={showLabels ? renderLabel : false}
          >
            {enrichedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          {showLegend && <Legend content={renderLegend} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Donut Chart (Pie chart with inner radius)
export const DonutChart = ({ title = "Distribution", ...props }) => (
  <PieChart
    title={title}
    innerRadius={40}
    outerRadius={80}
    showLabels={true}
    {...props}
  />
)

// Sentiment Distribution Pie Chart
export const SentimentPieChart = ({ data, title = "Comment Sentiment Distribution" }) => {
  const sentimentData = [
    {
      name: 'Positive',
      value: data.positive || 0,
      color: '#10b981'
    },
    {
      name: 'Neutral',
      value: data.neutral || 0,
      color: '#6b7280'
    },
    {
      name: 'Negative',
      value: data.negative || 0,
      color: '#ef4444'
    }
  ].filter(item => item.value > 0) // Only show non-zero values

  const colors = sentimentData.map(item => item.color)

  return (
    <PieChart
      data={sentimentData}
      title={title}
      colors={colors}
      height={250}
      showLabels={true}
    />
  )
}

// Category Distribution Pie Chart
export const CategoryPieChart = ({ data, title = "Video Categories" }) => {
  const categoryData = Object.entries(data).map(([category, count]) => ({
    name: category,
    value: count
  }))

  return (
    <DonutChart
      data={categoryData}
      title={title}
      height={300}
    />
  )
}

// Engagement Distribution Pie Chart
export const EngagementPieChart = ({ data, title = "Engagement Breakdown" }) => {
  const engagementData = [
    {
      name: 'Likes',
      value: data.like_count || 0
    },
    {
      name: 'Comments',
      value: data.comment_count || 0
    },
    {
      name: 'Shares',
      value: data.share_count || 0
    }
  ].filter(item => item.value > 0)

  return (
    <PieChart
      data={engagementData}
      title={title}
      height={250}
      colors={['#10b981', '#f59e0b', '#3b82f6']}
    />
  )
}

// Toxicity Levels Pie Chart
export const ToxicityPieChart = ({ data, title = "Comment Toxicity Levels" }) => {
  const toxicityData = [
    {
      name: 'Safe',
      value: (data.total_comments_analyzed || 0) - (data.toxic_comments_count || 0)
    },
    {
      name: 'Low Toxicity',
      value: data.toxicity_levels?.low || 0
    },
    {
      name: 'Medium Toxicity',
      value: data.toxicity_levels?.medium || 0
    },
    {
      name: 'High Toxicity',
      value: data.toxicity_levels?.high || 0
    }
  ].filter(item => item.value > 0)

  const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

  return (
    <PieChart
      data={toxicityData}
      title={title}
      colors={colors}
      height={250}
      showLabels={true}
    />
  )
}

// Duration Distribution Pie Chart
export const DurationPieChart = ({ data, title = "Video Duration Distribution" }) => {
  // Group videos by duration categories
  const durationGroups = {
    'Short (< 5 min)': 0,
    'Medium (5-15 min)': 0,
    'Long (15-30 min)': 0,
    'Extended (30+ min)': 0
  }

  data.forEach(video => {
    const duration = video.duration_seconds || 0
    if (duration < 300) {
      durationGroups['Short (< 5 min)']++
    } else if (duration < 900) {
      durationGroups['Medium (5-15 min)']++
    } else if (duration < 1800) {
      durationGroups['Long (15-30 min)']++
    } else {
      durationGroups['Extended (30+ min)']++
    }
  })

  const durationData = Object.entries(durationGroups)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      name: category,
      value: count
    }))

  return (
    <DonutChart
      data={durationData}
      title={title}
      height={250}
      colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
    />
  )
}

// Performance Distribution Pie Chart
export const PerformancePieChart = ({ data, title = "Video Performance Distribution" }) => {
  // Categorize videos by engagement rate
  const performanceGroups = {
    'Excellent (5%+)': 0,
    'Good (2-5%)': 0,
    'Average (1-2%)': 0,
    'Poor (<1%)': 0
  }

  data.forEach(video => {
    const engagement = video.engagement_rate || 0
    if (engagement >= 5) {
      performanceGroups['Excellent (5%+)']++
    } else if (engagement >= 2) {
      performanceGroups['Good (2-5%)']++
    } else if (engagement >= 1) {
      performanceGroups['Average (1-2%)']++
    } else {
      performanceGroups['Poor (<1%)']++
    }
  })

  const performanceData = Object.entries(performanceGroups)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      name: category,
      value: count
    }))

  return (
    <PieChart
      data={performanceData}
      title={title}
      height={250}
      colors={['#10b981', '#65a30d', '#f59e0b', '#ef4444']}
      showLabels={true}
    />
  )
}

export default PieChart