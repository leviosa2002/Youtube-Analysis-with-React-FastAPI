import React from 'react'
import { formatNumber } from '../../services/utils'

const HeatmapChart = ({
  data = [],
  title = '',
  subtitle = '',
  xAxisLabel = '',
  yAxisLabel = '',
  valueLabel = 'Value',
  colorScale = ['#f0f9ff', '#0369a1'], // Light blue to dark blue
  showValues = true,
  showTooltip = true,
  className = ''
}) => {
  // Get unique X and Y values
  const xValues = [...new Set(data.map(d => d.x))].sort((a, b) => a - b)
  const yValues = [...new Set(data.map(d => d.y))].sort((a, b) => a - b)
  
  // Find min and max values for color scaling
  const values = data.map(d => d.value).filter(v => v !== null && v !== undefined)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  
  // Create a data matrix for easier access
  const dataMatrix = {}
  data.forEach(d => {
    if (!dataMatrix[d.y]) dataMatrix[d.y] = {}
    dataMatrix[d.y][d.x] = d.value
  })
  
  // Calculate color intensity based on value
  const getColor = (value) => {
    if (value === null || value === undefined || maxValue === minValue) {
      return '#f3f4f6' // Gray for no data
    }
    
    const intensity = (value - minValue) / (maxValue - minValue)
    
    // Interpolate between light and dark color
    const lightColor = hexToRgb(colorScale[0])
    const darkColor = hexToRgb(colorScale[1])
    
    const r = Math.round(lightColor.r + intensity * (darkColor.r - lightColor.r))
    const g = Math.round(lightColor.g + intensity * (darkColor.g - lightColor.g))
    const b = Math.round(lightColor.b + intensity * (darkColor.b - lightColor.b))
    
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // Helper function to convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  // Get text color based on background (light vs dark)
  const getTextColor = (bgColor) => {
    const rgb = bgColor.match(/\d+/g)
    if (!rgb) return '#000000'
    
    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000
    return brightness > 128 ? '#000000' : '#ffffff'
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
            <p className="text-xs mt-1">Heatmap will appear when data is loaded</p>
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
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Y-axis label */}
          {yAxisLabel && (
            <div className="flex items-center mb-2">
              <div className="w-12 text-xs text-gray-600 font-medium transform -rotate-90 text-center">
                {yAxisLabel}
              </div>
            </div>
          )}
          
          <div className="flex">
            {/* Y-axis values */}
            <div className="flex flex-col">
              {yValues.map(y => (
                <div
                  key={y}
                  className="h-8 w-12 flex items-center justify-end pr-2 text-xs text-gray-600"
                >
                  {y}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            <div className="flex-1">
              {/* X-axis values */}
              <div className="flex mb-1">
                {xValues.map(x => (
                  <div
                    key={x}
                    className="w-8 h-6 flex items-center justify-center text-xs text-gray-600"
                  >
                    {x}
                  </div>
                ))}
              </div>
              
              {/* Grid cells */}
              {yValues.map(y => (
                <div key={y} className="flex">
                  {xValues.map(x => {
                    const value = dataMatrix[y]?.[x]
                    const bgColor = getColor(value)
                    const textColor = getTextColor(bgColor)
                    
                    return (
                      <div
                        key={`${x}-${y}`}
                        className="w-8 h-8 border border-gray-200 flex items-center justify-center text-xs relative group cursor-pointer"
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {showValues && value !== null && value !== undefined && (
                          <span className="font-medium">{value}</span>
                        )}
                        
                        {/* Tooltip */}
                        {showTooltip && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            <div>{`${xAxisLabel || 'X'}: ${x}`}</div>
                            <div>{`${yAxisLabel || 'Y'}: ${y}`}</div>
                            <div>{`${valueLabel}: ${value !== null && value !== undefined ? formatNumber(value) : 'No data'}`}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* X-axis label */}
          {xAxisLabel && (
            <div className="mt-2 text-center">
              <div className="text-xs text-gray-600 font-medium">
                {xAxisLabel}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Color scale legend */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <span className="text-xs text-gray-500">Less</span>
        <div className="flex">
          {Array.from({ length: 10 }, (_, i) => {
            const intensity = i / 9
            const lightColor = hexToRgb(colorScale[0])
            const darkColor = hexToRgb(colorScale[1])
            
            const r = Math.round(lightColor.r + intensity * (darkColor.r - lightColor.r))
            const g = Math.round(lightColor.g + intensity * (darkColor.g - lightColor.g))
            const b = Math.round(lightColor.b + intensity * (darkColor.b - lightColor.b))
            
            return (
              <div
                key={i}
                className="w-4 h-4 border border-gray-200"
                style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
              />
            )
          })}
        </div>
        <span className="text-xs text-gray-500">More</span>
      </div>
    </div>
  )
}

// Upload Frequency Heatmap
export const UploadFrequencyHeatmap = ({ data, title = "Upload Frequency by Day and Hour" }) => {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  // Transform data to include day names
  const transformedData = data.map(d => ({
    x: d.hour,
    y: dayNames[d.day] || d.day,
    value: d.count
  }))
  
  return (
    <HeatmapChart
      data={transformedData}
      title={title}
      xAxisLabel="Hour of Day"
      yAxisLabel="Day of Week"
      valueLabel="Upload Count"
      colorScale={['#fef2f2', '#dc2626']} // Light red to YouTube red
    />
  )
}

// Engagement Heatmap by Time
export const EngagementHeatmap = ({ data, title = "Engagement Patterns" }) => {
  return (
    <HeatmapChart
      data={data}
      title={title}
      xAxisLabel="Time Period"
      yAxisLabel="Metric"
      valueLabel="Engagement Score"
      colorScale={['#f0f9ff', '#2563eb']} // Light blue to dark blue
    />
  )
}

// Performance Heatmap
export const PerformanceHeatmap = ({ data, title = "Video Performance Matrix" }) => {
  return (
    <HeatmapChart
      data={data}
      title={title}
      xAxisLabel="Duration Category"
      yAxisLabel="Upload Time"
      valueLabel="Avg Views"
      colorScale={['#f0fdf4', '#059669']} // Light green to dark green
      showValues={false} // Too many values might clutter
    />
  )
}

// Sentiment Heatmap
export const SentimentHeatmap = ({ data, title = "Sentiment Distribution Over Time" }) => {
  return (
    <HeatmapChart
      data={data}
      title={title}
      xAxisLabel="Time Period"
      yAxisLabel="Sentiment Type"
      valueLabel="Percentage"
      colorScale={['#fefce8', '#ca8a04']} // Light yellow to dark yellow
    />
  )
}

// Activity Heatmap
export const ActivityHeatmap = ({ data, title = "Channel Activity Patterns" }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  // Transform data to include month names
  const transformedData = data.map(d => ({
    x: months[d.month - 1] || d.month,
    y: d.year,
    value: d.count
  }))
  
  return (
    <HeatmapChart
      data={transformedData}
      title={title}
      xAxisLabel="Month"
      yAxisLabel="Year"
      valueLabel="Video Count"
      colorScale={['#f8fafc', '#475569']} // Light gray to dark gray
    />
  )
}

export default HeatmapChart