import { useState, useCallback } from 'react'
import { videoAPI } from '../services/api'
import { handleAsyncError } from '../services/utils'

/**
 * Custom hook for managing video data and analysis
 */
export const useVideoData = () => {
  const [state, setState] = useState({
    // Loading states
    loading: false,
    commentsLoading: false,
    sentimentLoading: false,
    toxicityLoading: false,
    keywordsLoading: false,
    exportLoading: false,
    
    // Data
    videoData: null,
    comments: null,
    sentimentData: null,
    toxicityData: null,
    keywordsData: null,
    
    // Error handling
    error: null,
    
    // Configuration
    lastVideoId: null,
    sessionId: null
  })

  // Reset state
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: false,
      commentsLoading: false,
      sentimentLoading: false,
      toxicityLoading: false,
      keywordsLoading: false,
      exportLoading: false,
      videoData: null,
      comments: null,
      sentimentData: null,
      toxicityData: null,
      keywordsData: null,
      error: null,
      lastVideoId: null
    }))
  }, [])

// Analyze video
  const analyzeVideo = useCallback(async (videoId, options = {}) => {
    console.log('useVideoData: analyzeVideo called with videoId:', videoId, 'and options:', options); // Added log

    if (!videoId) {
      console.log('useVideoData: videoId is null or undefined. Setting error.'); // Added log
      setState(prev => ({ 
        ...prev, 
        error: 'Video ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      lastVideoId: videoId
    }))

    try {
      console.log('useVideoData: Calling videoAPI.analyzeVideo with:', videoId, options); // Added log
      const data = await videoAPI.analyzeVideo(videoId, options)
      console.log('useVideoData: videoAPI.analyzeVideo returned data:', data); // Added log
      
      setState(prev => ({
        ...prev,
        loading: false,
        videoData: data,
        sessionId: data.session_id,
        error: null
      }))

      return data
    } catch (error) {
      console.error('useVideoData: Error during video analysis:', error); // Added log
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Get video comments
  const getVideoComments = useCallback(async (videoId, maxComments = 100) => {
    if (!videoId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Video ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      commentsLoading: true, 
      error: null 
    }))

    try {
      const data = await videoAPI.getVideoComments(videoId, maxComments)
      
      setState(prev => ({
        ...prev,
        commentsLoading: false,
        comments: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        commentsLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Analyze video sentiment
  const analyzeVideoSentiment = useCallback(async (videoId, maxComments = 500, sessionId) => {
    if (!videoId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Video ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      sentimentLoading: true, 
      error: null 
    }))

    try {
      const data = await videoAPI.analyzeVideoSentiment(videoId, maxComments, sessionId)
      
      setState(prev => ({
        ...prev,
        sentimentLoading: false,
        sentimentData: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        sentimentLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Analyze video toxicity
  const analyzeVideoToxicity = useCallback(async (videoId, maxComments = 500, sessionId) => {
    if (!videoId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Video ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      toxicityLoading: true, 
      error: null 
    }))

    try {
      const data = await videoAPI.analyzeVideoToxicity(videoId, maxComments, sessionId)
      
      setState(prev => ({
        ...prev,
        toxicityLoading: false,
        toxicityData: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        toxicityLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Extract video keywords
  const extractVideoKeywords = useCallback(async (videoId, includeComments = true, maxComments = 500) => {
    if (!videoId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Video ID is required' 
      }))
      return null
    }

    setState(prev => ({ 
      ...prev, 
      keywordsLoading: true, 
      error: null 
    }))

    try {
      const data = await videoAPI.extractVideoKeywords(videoId, includeComments, maxComments)
      
      setState(prev => ({
        ...prev,
        keywordsLoading: false,
        keywordsData: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        keywordsLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Export video analysis
  const exportVideoAnalysis = useCallback(async (videoId, sessionId) => {
    if (!videoId || !sessionId) {
      setState(prev => ({ 
        ...prev, 
        error: 'Video ID and session ID are required' 
      }))
      return false
    }

    setState(prev => ({ 
      ...prev, 
      exportLoading: true, 
      error: null 
    }))

    try {
      const response = await videoAPI.exportVideoAnalysis(videoId, sessionId)
      
      // Trigger download
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'text/csv' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `video_analysis_${videoId}_${Date.now()}.csv`
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
    if (state.lastVideoId) {
      analyzeVideo(state.lastVideoId)
    }
  }, [state.lastVideoId, analyzeVideo])

  // Get current analysis data
  const getCurrentAnalysis = useCallback(() => {
    return {
      videoData: state.videoData,
      comments: state.comments,
      sentimentData: state.sentimentData,
      toxicityData: state.toxicityData,
      keywordsData: state.keywordsData,
      sessionId: state.sessionId
    }
  }, [state.videoData, state.comments, state.sentimentData, state.toxicityData, state.keywordsData, state.sessionId])

  // Check if data is available
  const hasData = state.videoData !== null
  const hasComments = state.comments !== null
  const hasSentimentData = state.sentimentData !== null
  const hasToxicityData = state.toxicityData !== null
  const hasKeywordsData = state.keywordsData !== null
  const isLoading = state.loading || state.commentsLoading || state.sentimentLoading || state.toxicityLoading || state.keywordsLoading
  const canExport = hasData && state.sessionId && state.lastVideoId

  return {
    // State
    ...state,
    hasData,
    hasComments,
    hasSentimentData,
    hasToxicityData,
    hasKeywordsData,
    isLoading,
    canExport,

    // Actions
    analyzeVideo,
    getVideoComments,
    analyzeVideoSentiment,
    analyzeVideoToxicity,
    extractVideoKeywords,
    exportVideoAnalysis,
    retryAnalysis,
    reset,
    getCurrentAnalysis
  }
}

/**
 * Hook for managing multiple video analyses (for comparison)
 */
export const useMultipleVideos = () => {
  const [state, setState] = useState({
    videos: new Map(),    // videoId -> analysis data
    loading: new Set(),   // Set of currently loading video IDs
    errors: new Map(),    // videoId -> error message
    sessionIds: new Map() // videoId -> session ID
  })

  // Add or update video analysis
  const addVideo = useCallback(async (videoId, options = {}) => {
    if (!videoId) return null

    // Add to loading set
    setState(prev => ({
      ...prev,
      loading: new Set([...prev.loading, videoId]),
      errors: new Map([...prev.errors].filter(([id]) => id !== videoId))
    }))

    try {
      const data = await videoAPI.analyzeVideo(videoId, options)
      
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(videoId)
        
        return {
          ...prev,
          loading: newLoading,
          videos: new Map(prev.videos).set(videoId, data),
          sessionIds: new Map(prev.sessionIds).set(videoId, data.session_id)
        }
      })

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      
      setState(prev => {
        const newLoading = new Set(prev.loading)
        newLoading.delete(videoId)
        
        return {
          ...prev,
          loading: newLoading,
          errors: new Map(prev.errors).set(videoId, errorMessage)
        }
      })
      
      return null
    }
  }, [])

  // Remove video from comparison
  const removeVideo = useCallback((videoId) => {
    setState(prev => {
      const newVideos = new Map(prev.videos)
      const newErrors = new Map(prev.errors)
      const newSessionIds = new Map(prev.sessionIds)
      const newLoading = new Set(prev.loading)
      
      newVideos.delete(videoId)
      newErrors.delete(videoId)
      newSessionIds.delete(videoId)
      newLoading.delete(videoId)
      
      return {
        ...prev,
        videos: newVideos,
        errors: newErrors,
        sessionIds: newSessionIds,
        loading: newLoading
      }
    })
  }, [])

  // Clear all videos
  const clearAll = useCallback(() => {
    setState({
      videos: new Map(),
      loading: new Set(),
      errors: new Map(),
      sessionIds: new Map()
    })
  }, [])

  // Get video data
  const getVideo = useCallback((videoId) => {
    return state.videos.get(videoId)
  }, [state.videos])

  // Get video error
  const getVideoError = useCallback((videoId) => {
    return state.errors.get(videoId)
  }, [state.errors])

  // Check if video is loading
  const isVideoLoading = useCallback((videoId) => {
    return state.loading.has(videoId)
  }, [state.loading])

  // Get all video IDs
  const getVideoIds = useCallback(() => {
    return Array.from(state.videos.keys())
  }, [state.videos])

  // Get comparison data
  const getComparisonData = useCallback(() => {
    const videoIds = Array.from(state.videos.keys())
    return videoIds.map(id => state.videos.get(id))
  }, [state.videos])

  return {
    // State
    videos: state.videos,
    loading: state.loading,
    errors: state.errors,
    sessionIds: state.sessionIds,
    
    // Computed
    videoCount: state.videos.size,
    isLoading: state.loading.size > 0,
    hasErrors: state.errors.size > 0,
    
    // Actions
    addVideo,
    removeVideo,
    clearAll,
    getVideo,
    getVideoError,
    isVideoLoading,
    getVideoIds,
    getComparisonData
  }
}

export default useVideoData