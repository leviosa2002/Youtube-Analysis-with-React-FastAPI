import { useState, useEffect, useCallback } from 'react'
import { channelAPI } from '../services/api'
import { handleAsyncError } from '../services/utils'

/**
 * Custom hook for managing channel data and analysis
 */
export const useChannelData = () => {
  const [state, setState] = useState({
    // Loading states
    loading: false,
    videosLoading: false,
    exportLoading: false,
    
    // Data
    channelData: null,
    channelVideos: null,
    growthData: null,
    
    // Error handling
    error: null,
    
    // Configuration
    lastChannelId: null,
    sessionId: null
  })

  // Reset state
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: false,
      videosLoading: false,
      exportLoading: false,
      channelData: null,
      channelVideos: null,
      growthData: null,
      error: null,
      lastChannelId: null
    }))
  }, [])

  // Analyze channel
  const analyzeChannel = useCallback(async (channelId, options = {}) => {
    if (!channelId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Channel ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      lastChannelId: channelId
    }))

    try {
      const data = await channelAPI.analyzeChannel(channelId, options)

      console.log("useChannelData: Data received from API call:", data); 
      
      setState(prev => ({
        ...prev,
        loading: false,
        channelData: data,
        sessionId: data.session_id,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Get channel videos
  const getChannelVideos = useCallback(async (channelId, maxResults = 50) => {
    if (!channelId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Channel ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      videosLoading: true, 
      error: null 
    }))

    try {
      const data = await channelAPI.getChannelVideos(channelId, maxResults)
      
      setState(prev => ({
        ...prev,
        videosLoading: false,
        channelVideos: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        videosLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Get channel growth data
  const getChannelGrowth = useCallback(async (channelId, sessionId) => {
    if (!channelId || !sessionId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Channel ID and session ID are required' 
      }))
      return null
    }

    try {
      const data = await channelAPI.getChannelGrowth(channelId, sessionId)
      
      setState(prev => ({
        ...prev,
        growthData: data.growth_data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Export channel analysis
  const exportChannelAnalysis = useCallback(async (channelId, sessionId) => {
    if (!channelId || !sessionId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Channel ID and session ID are required' 
      }))
      return false
    }

    setState(prev => ({ 
      ...prev, 
      exportLoading: true, 
      error: null 
    }))

    try {
      const response = await channelAPI.exportChannelAnalysis(channelId, sessionId)
      
      // Trigger download
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'text/csv' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `channel_analysis_${channelId}_${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      setState(prev => ({
        ...prev,
        exportLoading: false,
        error: null
      }))

      return true
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        exportLoading: false,
        error: errorMessage
      }))
      return false
    }
  }, [])

  // Retry last analysis
  const retryAnalysis = useCallback(() => {
    if (state.lastChannelId) {
      analyzeChannel(state.lastChannelId)
    }
  }, [state.lastChannelId, analyzeChannel])

  // Get current analysis data
  const getCurrentAnalysis = useCallback(() => {
    return {
      channelData: state.channelData,
      channelVideos: state.channelVideos,
      growthData: state.growthData,
      sessionId: state.sessionId
    }
  }, [state.channelData, state.channelVideos, state.growthData, state.sessionId])

  // Check if data is available
  const hasData = state.channelData !== null
  const hasVideos = state.channelVideos !== null
  const hasGrowthData = state.growthData !== null
  const isLoading = state.loading || state.videosLoading
  const canExport = hasData && state.sessionId && state.lastChannelId

  return {
    // State
    ...state,
    hasData,
    hasVideos,
    hasGrowthData,
    isLoading,
    canExport,

    // Actions
    analyzeChannel,
    getChannelVideos,
    getChannelGrowth,
    exportChannelAnalysis,
    retryAnalysis,
    reset,
    getCurrentAnalysis
  }
}

/**
 * Hook for managing multiple channel analyses (for comparison)
 */
export const useMultipleChannels = () => {
  const [state, setState] = useState({
    channels: new Map(), // channelId -> analysis data
    loading: new Set(),  // Set of currently loading channel IDs
    errors: new Map(),   // channelId -> error message
    sessionIds: new Map() // channelId -> session ID
  })

  // Add or update channel analysis
  const addChannel = useCallback(async (channelId, options = {}) => {
    if (!channelId) return null

    // Add to loading set
    setState(prev => ({
      ...prev,
      loading: new Set([...prev.loading, channelId]),
      errors: new Map([...prev.errors].filter(([id]) => id !== channelId))
    }))

    try {
      const data = await channelAPI.analyzeChannel(channelId, options)
      
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(channelId)
        
        return {
          ...prev,
          loading: newLoading,
          channels: new Map(prev.channels).set(channelId, data),
          sessionIds: new Map(prev.sessionIds).set(channelId, data.session_id)
        }
      })

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(channelId)
        
        return {
          ...prev,
          loading: newLoading,
          errors: new Map(prev.errors).set(channelId, errorMessage)
        }
      })
      
      return null
    }
  }, [])

  // Remove channel from comparison
  const removeChannel = useCallback((channelId) => {
    setState(prev => {
      const newChannels = new Map(prev.channels)
      const newErrors = new Map(prev.errors)
      const newSessionIds = new Map(prev.sessionIds)
      const newLoading = new Set(prev.loading)
      
      newChannels.delete(channelId)
      newErrors.delete(channelId)
      newSessionIds.delete(channelId)
      newLoading.delete(channelId)
      
      return {
        ...prev,
        channels: newChannels,
        errors: newErrors,
        sessionIds: newSessionIds,
        loading: newLoading
      }
    })
  }, [])

  // Clear all channels
  const clearAll = useCallback(() => {
    setState({
      channels: new Map(),
      loading: new Set(),
      errors: new Map(),
      sessionIds: new Map()
    })
  }, [])

  // Get channel data
  const getChannel = useCallback((channelId) => {
    return state.channels.get(channelId)
  }, [state.channels])

  // Get channel error
  const getChannelError = useCallback((channelId) => {
    return state.errors.get(channelId)
  }, [state.errors])

  // Check if channel is loading
  const isChannelLoading = useCallback((channelId) => {
    return state.loading.has(channelId)
  }, [state.loading])

  // Get all channel IDs
  const getChannelIds = useCallback(() => {
    return Array.from(state.channels.keys())
  }, [state.channels])

  // Get comparison data
  const getComparisonData = useCallback(() => {
    const channelIds = Array.from(state.channels.keys())
    return channelIds.map(id => state.channels.get(id))
  }, [state.channels])

  return {
    // State
    channels: state.channels,
    loading: state.loading,
    errors: state.errors,
    sessionIds: state.sessionIds,
    
    // Computed
    channelCount: state.channels.size,
    isLoading: state.loading.size > 0,
    hasErrors: state.errors.size > 0,
    
    // Actions
    addChannel,
    removeChannel,
    clearAll,
    getChannel,
    getChannelError,
    isChannelLoading,
    getChannelIds,
    getComparisonData
  }
}

export default useChannelData