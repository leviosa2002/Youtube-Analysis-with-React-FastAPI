import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 120000, // <<<<<<<<<<<<<<<<< CHANGED THIS TO 60 SECONDS (60000 MS)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding session ID AND DEBUGGING LOGS
api.interceptors.request.use(
  (config) => {
    // Add session ID to requests if available
    const sessionId = sessionStorage.getItem('session_id')
    if (sessionId && !config.params?.session_id) {
      config.params = { ...config.params, session_id: sessionId }
    }

    // <<<<<<<<<<<<<<<<<<< ADDED DEBUGGING LOGS HERE
    console.log('API Request Interceptor: Sending request to', config.url, 'with method', config.method.toUpperCase());
    if (config.params) {
      console.log('API Request Interceptor: Params:', config.params);
    }
    if (config.data) {
      console.log('API Request Interceptor: Data:', config.data);
    }
    // <<<<<<<<<<<<<<<<<<< END ADDED DEBUGGING LOGS

    return config
  },
  (error) => {
    // <<<<<<<<<<<<<<<<<<< ADDED DEBUGGING LOG HERE
    console.error('API Request Interceptor Error:', error);
    // <<<<<<<<<<<<<<<<<<< END ADDED DEBUGGING LOG
    return Promise.reject(error)
  }
)

// Response interceptor for handling session ID and errors AND DEBUGGING LOGS
api.interceptors.response.use(
  (response) => {
    // Store session ID from response
    if (response.data?.session_id) {
      sessionStorage.setItem('session_id', response.data.session_id)
    }

    // <<<<<<<<<<<<<<<<<<< ADDED DEBUGGING LOGS HERE
    console.log('API Response Interceptor: Received successful response from', response.config.url);
    // You can uncomment the line below if you want to see the full response data in the console
    // console.log('API Response Interceptor: Data:', response.data);
    // <<<<<<<<<<<<<<<<<<< END ADDED DEBUGGING LOGS

    return response
  },
  (error) => {
    // <<<<<<<<<<<<<<<<<<< ADDED DEBUGGING LOGS HERE
    console.error('API Response Interceptor Error:', error);
    if (error.response) {
      console.error('API Response Interceptor Error: Status:', error.response.status);
      console.error('API Response Interceptor Error: Data:', error.response.data);
      console.error('API Response Interceptor Error: Headers:', error.response.headers);
    } else if (error.request) {
      console.error('API Response Interceptor Error: No response received. Request:', error.request);
    } else {
      console.error('API Response Interceptor Error: Error message:', error.message);
    }
    // <<<<<<<<<<<<<<<<<<< END ADDED DEBUGGING LOGS

    // Handle common error scenarios (YOUR EXISTING LOGIC)
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please check your connection and try again.'
    } else if (error.response?.status === 404) {
      error.message = error.response.data?.detail || 'Resource not found'
    } else if (error.response?.status === 500) {
      error.message = 'Server error. Please try again later.'
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection.'
    }

    return Promise.reject(error)
  }
)

// ============================================================================
// Channel Analysis API
// ============================================================================

export const channelAPI = {
  // Analyze a channel
  analyzeChannel: async (channelId, options = {}) => {
    const params = {
      include_videos: true,
      max_videos: 50,
      include_keywords: true,
      ...options
    }
    
    const response = await api.get(`/channel/${channelId}`, { params })
    return response.data
  },

  // Get channel videos
  getChannelVideos: async (channelId, maxResults = 50) => {
    const response = await api.get(`/channel/${channelId}/videos`, {
      params: { max_results: maxResults }
    })
    return response.data
  },

  // Get channel growth data
  getChannelGrowth: async (channelId, sessionId) => {
    const response = await api.get(`/channel/${channelId}/growth`, {
      params: { session_id: sessionId }
    })
    return response.data
  },

  // Export channel analysis
  exportChannelAnalysis: async (channelId, sessionId) => {
    const response = await api.get(`/channel/${channelId}/export`, {
      params: { session_id: sessionId },
      responseType: 'blob'
    })
    return response
  }
}

// ============================================================================
// Video Analysis API
// ============================================================================

export const videoAPI = {
  // Analyze a video
  analyzeVideo: async (videoId, options = {}) => {
    const params = {
      include_comments: true,
      max_comments: 500,
      include_sentiment: true,
      include_keywords: true,
      include_toxicity: true,
      ...options
    }
    // <<<<<<<<<<<<<<<<<<< ADDED DEBUG LOG HERE
    console.log(`videoAPI.analyzeVideo: Calling GET /video/${videoId} with params:`, params);
    try {
      const response = await api.get(`/video/${videoId}`, { params });
      // <<<<<<<<<<<<<<<<<<< ADDED DEBUG LOG HERE
      console.log('videoAPI.analyzeVideo: Received successful response:', response.data);
      return response.data;
    } catch (error) {
      // <<<<<<<<<<<<<<<<<<< ADDED DEBUG LOG HERE
      console.error('videoAPI.analyzeVideo: Error during API call:', error.response?.data || error.message || error);
      throw error; // Re-throw the error so it can be caught by useVideoData's handleAsyncError
    }
  },

  // Get video comments
  getVideoComments: async (videoId, maxComments = 100) => {
    const response = await api.get(`/video/${videoId}/comments`, {
      params: { max_comments: maxComments }
    })
    return response.data
  },

  // Analyze video sentiment
  analyzeVideoSentiment: async (videoId, maxComments = 500, sessionId) => {
    const response = await api.get(`/video/${videoId}/sentiment`, {
      params: {
        max_comments: maxComments,
        session_id: sessionId
      }
    })
    return response.data
  },

  // Analyze video toxicity
  analyzeVideoToxicity: async (videoId, maxComments = 500, sessionId) => {
    const response = await api.get(`/video/${videoId}/toxicity`, {
      params: {
        max_comments: maxComments,
        session_id: sessionId
      }
    })
    return response.data
  },

  // Extract video keywords
  extractVideoKeywords: async (videoId, includeComments = true, maxComments = 500) => {
    const response = await api.get(`/video/${videoId}/keywords`, {
      params: {
        include_comments: includeComments,
        max_comments: maxComments
      }
    })
    return response.data
  },

  // Export video analysis
  exportVideoAnalysis: async (videoId, sessionId) => {
    const response = await api.get(`/video/${videoId}/export`, {
      params: { session_id: sessionId },
      responseType: 'blob'
    })
    return response
  }
}

// ============================================================================
// Trending Analysis API
// ============================================================================

export const trendingAPI = {
  // Get trending videos
  getTrendingVideos: async (options = {}) => {
    const params = {
      country: 'US',
      max_results: 50,
      ...options
    }
    
    const response = await api.get('/trending', { params })
    return response.data
  },

  // Get YouTube categories
  getCategories: async () => {
    const response = await api.get('/trending/categories')
    return response.data
  },

  // Get supported countries
  getCountries: async () => {
    const response = await api.get('/trending/countries')
    return response.data
  },

  // Get trending velocity data
  getTrendingVelocity: async (country = 'US', topN = 20, sessionId) => {
    const response = await api.get('/trending/velocity', {
      params: { 
        country,
        top_n: topN,
        session_id: sessionId 
      }
    })
    return response.data
  },

  // Get trending statistics
  getTrendingStats: async (country = 'US', sessionId) => {
    const response = await api.get('/trending/stats', {
      params: { 
        country,
        session_id: sessionId 
      }
    })
    return response.data
  },

  // Export trending analysis
  exportTrendingAnalysis: async (country, categoryId, maxResults, sessionId) => {
    const response = await api.get('/trending/export', {
      params: { 
        country,
        category_id: categoryId,
        max_results: maxResults,
        session_id: sessionId 
      },
      responseType: 'blob'
    })
    return response
  }
}

// ============================================================================
// Comparison Analysis API
// ============================================================================

export const comparisonAPI = {
  // Compare channels
  compareChannels: async (channelIds, sessionId) => {
    const response = await api.post('/compare/channels', 
      { channel_ids: channelIds },
      { params: { session_id: sessionId } }
    )
    return response.data
  },

  // Compare videos
  compareVideos: async (videoIds, sessionId) => {
    const response = await api.post('/compare/videos', 
      { video_ids: videoIds },
      { params: { session_id: sessionId } }
    )
    return response.data
  },

  // Export channel comparison
  exportChannelComparison: async (channelIds, sessionId) => {
    const response = await api.get('/compare/channels/export', {
      params: { 
        channel_ids: channelIds.join(','),
        session_id: sessionId 
      },
      responseType: 'blob'
    })
    return response
  },

  // Export video comparison
  exportVideoComparison: async (videoIds, sessionId) => {
    const response = await api.get('/compare/videos/export', {
      params: { 
        video_ids: videoIds.join(','),
        session_id: sessionId 
      },
      responseType: 'blob'
    })
    return response
  }
}

// ============================================================================
// Health Check API
// ============================================================================

export const healthAPI = {
  // Check API health
  checkHealth: async () => {
    const response = await api.get('/health')
    return response.data
  },

  // Check root endpoint
  checkRoot: async () => {
    const response = await axios.get('http://localhost:8000/')
    return response.data
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export const apiUtils = {
  // Create download from blob response
  downloadBlob: (response, filename) => {
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'text/csv' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'download.csv'
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
  },

  // Get session ID
  getSessionId: () => {
    return sessionStorage.getItem('session_id')
  },

  // Clear session
  clearSession: () => {
    sessionStorage.removeItem('session_id')
  },

  // Format API error for display
  formatError: (error) => {
    if (error.response?.data?.detail) {
      return error.response.data.detail
    }
    return error.message || 'An unexpected error occurred'
  },

  // Check if YouTube ID is valid
  isValidYouTubeId: (id, type = 'video') => {
    if (type === 'video') {
      return /^[a-zA-Z0-9_-]{11}$/.test(id)
    } else if (type === 'channel') {
      return /^(UC[a-zA-Z0-9_-]{22}|[a-zA-Z0-9._-]{3,100})$/.test(id)
    }
    return false
  }
}

export default api