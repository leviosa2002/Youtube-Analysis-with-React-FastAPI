import { useState, useEffect, useCallback } from 'react'
import { trendingAPI } from '../services/api'
import { handleAsyncError } from '../services/utils'

/**
 * Custom hook for managing trending videos data and analysis
 */
export const useTrendingData = () => {
  const [state, setState] = useState({
    // Loading states
    loading: false,
    velocityLoading: false,
    statsLoading: false,
    exportLoading: false,
    categoriesLoading: false,
    countriesLoading: false,
    
    // Data
    trendingData: null,
    velocityData: null,
    statsData: null,
    categories: null,
    countries: null,
    
    // Error handling
    error: null,
    
    // Configuration
    lastFilters: null,
    sessionId: null
  })

  // Reset state
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: false,
      velocityLoading: false,
      statsLoading: false,
      exportLoading: false,
      trendingData: null,
      velocityData: null,
      statsData: null,
      error: null,
      lastFilters: null
    }))
  }, [])

  // Get trending videos
  const getTrendingVideos = useCallback(async (options = {}) => {
    const filters = {
      country: 'US',
      max_results: 50,
      ...options
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      lastFilters: filters
    }))

    try {
      const data = await trendingAPI.getTrendingVideos(filters)
      
      setState(prev => ({
        ...prev,
        loading: false,
        trendingData: data,
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

  // Get trending velocity data
  const getTrendingVelocity = useCallback(async (country = 'US', topN = 20, sessionId) => {
    setState(prev => ({ 
      ...prev, 
      velocityLoading: true, 
      error: null 
    }))

    try {
      const data = await trendingAPI.getTrendingVelocity(country, topN, sessionId)
      
      setState(prev => ({
        ...prev,
        velocityLoading: false,
        velocityData: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        velocityLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Get trending statistics
  const getTrendingStats = useCallback(async (country = 'US', sessionId) => {
    setState(prev => ({ 
      ...prev, 
      statsLoading: true, 
      error: null 
    }))

    try {
      const data = await trendingAPI.getTrendingStats(country, sessionId)
      
      setState(prev => ({
        ...prev,
        statsLoading: false,
        statsData: data,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        statsLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Get YouTube categories
  const getCategories = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      categoriesLoading: true, 
      error: null 
    }))

    try {
      const data = await trendingAPI.getCategories()
      
      setState(prev => ({
        ...prev,
        categoriesLoading: false,
        categories: data.categories,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        categoriesLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Get supported countries
  const getCountries = useCallback(async () => {
    setState(prev => ({ 
      ...prev, 
      countriesLoading: true, 
      error: null 
    }))

    try {
      const data = await trendingAPI.getCountries()
      
      setState(prev => ({
        ...prev,
        countriesLoading: false,
        countries: data.countries,
        error: null
      }))

      return data
    } catch (error) {
      const errorMessage = handleAsyncError(error)
      setState(prev => ({
        ...prev,
        countriesLoading: false,
        error: errorMessage
      }))
      return null
    }
  }, [])

  // Export trending analysis
  const exportTrendingAnalysis = useCallback(async (country, categoryId, maxResults, sessionId) => {
    setState(prev => ({ 
      ...prev, 
      exportLoading: true, 
      error: null 
    }))

    try {
      const response = await trendingAPI.exportTrendingAnalysis(country, categoryId, maxResults, sessionId)
      
      // Trigger download
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'text/csv' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trending_analysis_${country}_${Date.now()}.csv`
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
    if (state.lastFilters) {
      getTrendingVideos(state.lastFilters)
    }
  }, [state.lastFilters, getTrendingVideos])

  // Get current analysis data
  const getCurrentAnalysis = useCallback(() => {
    return {
      trendingData: state.trendingData,
      velocityData: state.velocityData,
      statsData: state.statsData,
      sessionId: state.sessionId
    }
  }, [state.trendingData, state.velocityData, state.statsData, state.sessionId])

  // Auto-load categories and countries on mount
  useEffect(() => {
    if (!state.categories) {
      getCategories()
    }
    if (!state.countries) {
      getCountries()
    }
  }, [state.categories, state.countries, getCategories, getCountries])

  // Check if data is available
  const hasData = state.trendingData !== null
  const hasVelocityData = state.velocityData !== null
  const hasStatsData = state.statsData !== null
  const hasCategories = state.categories !== null
  const hasCountries = state.countries !== null
  const isLoading = state.loading || state.velocityLoading || state.statsLoading
  const canExport = hasData && state.sessionId && state.lastFilters

  return {
    // State
    ...state,
    hasData,
    hasVelocityData,
    hasStatsData,
    hasCategories,
    hasCountries,
    isLoading,
    canExport,

    // Actions
    getTrendingVideos,
    getTrendingVelocity,
    getTrendingStats,
    getCategories,
    getCountries,
    exportTrendingAnalysis,
    retryAnalysis,
    reset,
    getCurrentAnalysis
  }
}

/**
 * Hook for managing trending data with filtering and sorting
 */
export const useTrendingFilters = () => {
  const [state, setState] = useState({
    // Filters
    selectedCountry: 'US',
    selectedCategory: null,
    maxResults: 50,
    
    // Sorting
    sortBy: 'view_count',
    sortDirection: 'desc',
    
    // Search
    searchQuery: '',
    
    // View options
    viewMode: 'grid', // 'grid' or 'list'
    showThumbnails: true
  })

  // Update filter
  const updateFilter = useCallback((key, value) => {
    setState(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Update multiple filters
  const updateFilters = useCallback((filters) => {
    setState(prev => ({
      ...prev,
      ...filters
    }))
  }, [])

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setState({
      selectedCountry: 'US',
      selectedCategory: null,
      maxResults: 50,
      sortBy: 'view_count',
      sortDirection: 'desc',
      searchQuery: '',
      viewMode: 'grid',
      showThumbnails: true
    })
  }, [])

  // Get current filters for API call
  const getAPIFilters = useCallback(() => {
    return {
      country: state.selectedCountry,
      category_id: state.selectedCategory,
      max_results: state.maxResults
    }
  }, [state.selectedCountry, state.selectedCategory, state.maxResults])

  // Filter and sort videos
  const filterAndSortVideos = useCallback((videos) => {
    if (!videos || !Array.isArray(videos)) return []

    let filtered = videos

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(query) ||
        video.channel_title.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[state.sortBy]
      const bVal = b[state.sortBy]
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return state.sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      } else {
        return state.sortDirection === 'asc' 
          ? aVal - bVal 
          : bVal - aVal
      }
    })

    return filtered
  }, [state.searchQuery, state.sortBy, state.sortDirection])

  return {
    // State
    ...state,
    
    // Actions
    updateFilter,
    updateFilters,
    resetFilters,
    getAPIFilters,
    filterAndSortVideos
  }
}

/**
 * Hook for managing trending video categories
 */
export const useTrendingCategories = () => {
  const [state, setState] = useState({
    categories: null,
    loading: false,
    error: null
  })

  // Load categories
  const loadCategories = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const data = await trendingAPI.getCategories()
      setState(prev => ({
        ...prev,
        loading: false,
        categories: data.categories,
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

  // Get category name by ID
  const getCategoryName = useCallback((categoryId) => {
    if (!state.categories) return null
    const category = state.categories.find(cat => cat.id === categoryId)
    return category?.name || null
  }, [state.categories])

  // Get popular categories (you could enhance this with usage statistics)
  const getPopularCategories = useCallback(() => {
    if (!state.categories) return []
    
    // Return some commonly popular categories
    const popularIds = ['10', '23', '24', '25', '26', '27', '28']
    return state.categories.filter(cat => popularIds.includes(cat.id))
  }, [state.categories])

  // Auto-load on mount
  useEffect(() => {
    if (!state.categories && !state.loading) {
      loadCategories()
    }
  }, [state.categories, state.loading, loadCategories])

  return {
    ...state,
    loadCategories,
    getCategoryName,
    getPopularCategories,
    hasCategories: state.categories !== null
  }
}

export default useTrendingData