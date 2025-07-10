import React from 'react'
import { 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Wifi,
  Server,
  Key,
  Youtube
} from 'lucide-react'
import { useState } from 'react'

const ErrorMessage = ({ 
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  type = 'error',
  onRetry = null,
  onDismiss = null,
  showDetails = false,
  details = null,
  className = '',
  size = 'md',
  actionButton = null
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Error type configurations
  const errorTypes = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
      icon: AlertCircle
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500',
      icon: AlertCircle
    },
    network: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
      icon: Wifi
    },
    server: {
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800',
      iconColor: 'text-purple-500',
      icon: Server
    },
    api: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-500',
      icon: Key
    },
    youtube: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
      icon: Youtube
    }
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: 'p-3',
      iconSize: 'w-4 h-4',
      titleSize: 'text-sm',
      messageSize: 'text-xs'
    },
    md: {
      padding: 'p-4',
      iconSize: 'w-5 h-5',
      titleSize: 'text-base',
      messageSize: 'text-sm'
    },
    lg: {
      padding: 'p-6',
      iconSize: 'w-6 h-6',
      titleSize: 'text-lg',
      messageSize: 'text-base'
    }
  }

  const config = errorTypes[type] || errorTypes.error
  const sizes = sizeConfig[size]
  const Icon = config.icon

  return (
    <div className={`rounded-lg border ${config.bgColor} ${config.borderColor} ${sizes.padding} ${className}`}>
      <div className="flex items-start">
        <Icon className={`${sizes.iconSize} ${config.iconColor} mt-0.5 mr-3 flex-shrink-0`} />
        
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={`${sizes.titleSize} font-medium ${config.textColor} mb-1`}>
            {title}
          </h3>
          
          {/* Message */}
          <p className={`${sizes.messageSize} ${config.textColor} opacity-90`}>
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center text-sm font-medium ${config.textColor} hover:${config.textColor} underline`}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Try Again
              </button>
            )}

            {actionButton && (
              <div>
                {actionButton}
              </div>
            )}

            {showDetails && details && (
              <button
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className={`inline-flex items-center text-sm font-medium ${config.textColor} hover:${config.textColor} underline`}
              >
                Details
                {isDetailsOpen ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-sm font-medium ${config.textColor} hover:${config.textColor} underline`}
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Error details */}
          {isDetailsOpen && details && (
            <div className={`mt-4 p-3 bg-white bg-opacity-60 rounded border ${config.borderColor}`}>
              <pre className={`text-xs ${config.textColor} font-mono whitespace-pre-wrap overflow-auto max-h-32`}>
                {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Specialized error components for different scenarios
export const NetworkErrorMessage = ({ onRetry }) => (
  <ErrorMessage
    type="network"
    title="Connection Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    onRetry={onRetry}
  />
)

export const APIErrorMessage = ({ message, onRetry }) => (
  <ErrorMessage
    type="api"
    title="API Error"
    message={message || "There was an issue with the YouTube Data API. Please try again later."}
    onRetry={onRetry}
  />
)

export const YouTubeErrorMessage = ({ message, onRetry }) => (
  <ErrorMessage
    type="youtube"
    title="YouTube Data Error"
    message={message || "Unable to fetch data from YouTube. The video or channel might be private or deleted."}
    onRetry={onRetry}
  />
)

export const ServerErrorMessage = ({ onRetry }) => (
  <ErrorMessage
    type="server"
    title="Server Error"
    message="Our servers are experiencing issues. Please try again in a few moments."
    onRetry={onRetry}
  />
)

export const ValidationErrorMessage = ({ errors }) => (
  <ErrorMessage
    type="warning"
    title="Validation Error"
    message="Please check your input and try again."
    details={errors}
    showDetails={true}
  />
)

// Inline error for forms
export const InlineError = ({ message, className = '' }) => (
  <div className={`flex items-center text-red-600 text-sm mt-1 ${className}`}>
    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
    <span>{message}</span>
  </div>
)

// Empty state error
export const EmptyStateError = ({ 
  title = "No data found",
  message = "Try adjusting your search criteria or check back later.",
  actionText = "Refresh",
  onAction = null,
  illustration = null
}) => (
  <div className="text-center py-12">
    {illustration && (
      <div className="mb-6">
        {illustration}
      </div>
    )}
    
    <div className="max-w-md mx-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 mb-6">
        {message}
      </p>
      
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="btn-primary"
        >
          {actionText}
        </button>
      )}
    </div>
  </div>
)

// Error boundary fallback
export const ErrorBoundaryFallback = ({ error, resetError }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="max-w-md w-full">
      <ErrorMessage
        title="Application Error"
        message="Something went wrong in the application. Please refresh the page to continue."
        type="error"
        size="lg"
        onRetry={resetError}
        details={error?.message}
        showDetails={true}
        actionButton={
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary text-sm"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Reload Page
          </button>
        }
      />
    </div>
  </div>
)

// Global error toast component
export const ErrorToast = ({ 
  message, 
  isVisible, 
  onDismiss,
  autoClose = 5000 
}) => {
  React.useEffect(() => {
    if (isVisible && autoClose > 0) {
      const timer = setTimeout(onDismiss, autoClose)
      return () => clearTimeout(timer)
    }
  }, [isVisible, autoClose, onDismiss])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <ErrorMessage
        title="Error"
        message={message}
        type="error"
        size="sm"
        onDismiss={onDismiss}
        className="shadow-strong"
      />
    </div>
  )
}

export default ErrorMessage