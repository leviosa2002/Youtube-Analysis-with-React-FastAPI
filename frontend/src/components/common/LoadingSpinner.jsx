import React from 'react'
import { Loader2, Youtube, BarChart3 } from 'lucide-react'

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  type = 'spinner',
  className = '',
  fullScreen = false 
}) => {
  // Size variations
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  // Different spinner types
  const renderSpinner = () => {
    const spinnerClass = `${sizeClasses[size]} text-youtube-red`

    switch (type) {
      case 'youtube':
        return <Youtube className={`${spinnerClass} animate-pulse`} />
      
      case 'chart':
        return <BarChart3 className={`${spinnerClass} animate-bounce`} />
      
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-youtube-red rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-youtube-red rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-youtube-red rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-youtube-red rounded-full animate-pulse`}></div>
        )
      
      case 'bars':
        return (
          <div className="flex items-end space-x-1">
            <div className="w-1 h-4 bg-youtube-red animate-pulse"></div>
            <div className="w-1 h-6 bg-youtube-red animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-3 bg-youtube-red animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-5 bg-youtube-red animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          </div>
        )
      
      default:
        return <Loader2 className={`${spinnerClass} animate-spin`} />
    }
  }

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderSpinner()}
      {text && (
        <div className="text-center">
          <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
            {text}
          </p>
        </div>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-strong p-8">
          {content}
        </div>
      </div>
    )
  }

  return content
}

// Specialized loading components for different scenarios
export const ChannelLoadingSpinner = ({ text = 'Analyzing channel...' }) => (
  <LoadingSpinner 
    type="youtube" 
    text={text} 
    size="lg" 
    className="py-12"
  />
)

export const VideoLoadingSpinner = ({ text = 'Processing video data...' }) => (
  <LoadingSpinner 
    type="chart" 
    text={text} 
    size="lg" 
    className="py-12"
  />
)

export const DataLoadingSpinner = ({ text = 'Loading data...' }) => (
  <LoadingSpinner 
    type="bars" 
    text={text} 
    size="md" 
    className="py-8"
  />
)

export const InlineLoadingSpinner = ({ text = 'Loading...' }) => (
  <LoadingSpinner 
    type="spinner" 
    text={text} 
    size="sm" 
    className="py-4"
  />
)

// Loading skeleton for cards
export const LoadingSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className={`h-3 bg-gray-200 rounded mb-2 ${
          i === lines - 1 ? 'w-1/2' : 'w-full'
        }`}
      ></div>
    ))}
  </div>
)

// Card loading skeleton
export const CardLoadingSkeleton = () => (
  <div className="card animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
)

// Chart loading skeleton
export const ChartLoadingSkeleton = ({ height = 'h-64' }) => (
  <div className={`card animate-pulse ${height}`}>
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="flex items-end justify-between h-32 mb-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div 
          key={i} 
          className="bg-gray-200 rounded-t w-8"
          style={{ height: `${Math.random() * 80 + 20}%` }}
        ></div>
      ))}
    </div>
    <div className="flex justify-center space-x-4">
      <div className="h-3 bg-gray-200 rounded w-16"></div>
      <div className="h-3 bg-gray-200 rounded w-16"></div>
      <div className="h-3 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
)

// Table loading skeleton
export const TableLoadingSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="card">
    <div className="animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 mb-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={`h-3 bg-gray-200 rounded ${
                colIndex === 0 ? 'w-3/4' : 'w-full'
              }`}
            ></div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export default LoadingSpinner