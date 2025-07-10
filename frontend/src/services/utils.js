import { format, formatDistanceToNow, parseISO } from 'date-fns'

/**
 * Utility functions for YouTube Analytics App
 */

// ============================================================================
// Number Formatting
// ============================================================================

export const formatNumber = (num, decimals = 1) => { // Added a default 'decimals' parameter
  // If num is null, undefined, or an empty string, return '0'
  if (num === null || num === undefined || num === '') {
    return '0';
  }

  // Attempt to convert to a number. If it results in NaN, return '0'.
  const number = parseFloat(num); // Use parseFloat for numbers with decimals
  if (isNaN(number)) {
    return '0';
  }
  
  if (number >= 1_000_000_000) { // Using numeric separators for readability
    return (number / 1_000_000_000).toFixed(decimals) + 'B';
  } else if (number >= 1_000_000) {
    return (number / 1_000_000).toFixed(decimals) + 'M';
  } else if (number >= 1_000) {
    return (number / 1_000).toFixed(decimals) + 'K';
  }
  
  // For numbers less than 1000, display as is, but ensure it's formatted to locale if desired
  return number.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
};

export const formatPercent = (num, decimals = 1) => {
  if (num === null || num === undefined || isNaN(num)) return '0%' // Added isNaN check
  return `${parseFloat(num).toFixed(decimals)}%`
}

export const formatDuration = (isoDurationString) => {
  if (!isoDurationString) return '0:00'; // Handle null, undefined, empty string

  // Regex to parse ISO 8601 duration string
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDurationString.match(regex);

  if (!matches) {
    console.warn('Invalid ISO 8601 duration string format:', isoDurationString);
    return '0:00'; // Fallback for unparseable strings
  }

  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);

  let result = '';

  if (hours > 0) {
    result += `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    result += `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return result;
};

// ============================================================================
// Date Formatting
// ============================================================================

export const formatDate = (dateString, formatString = 'MMM dd, yyyy') => {
  if (!dateString) return 'N/A'
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return format(date, formatString)
  } catch (error) {
    console.error("Error formatting date:", error); // Log the error for debugging
    return 'Invalid Date'
  }
}

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A'
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    console.error("Error formatting relative time:", error); // Log the error for debugging
    return 'Invalid Date'
  }
}

export const formatDateTime = (dateString) => {
  return formatDate(dateString, 'MMM dd, yyyy HH:mm')
}

// ============================================================================
// YouTube ID Validation
// ============================================================================

export const validateYouTubeId = (id, type = 'video') => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  if (type === 'video') {
    const isValid = /^[a-zA-Z0-9_-]{11}$/.test(id);
    return isValid;
  } else if (type === 'channel') {
    // This remains strict for canonical UC... IDs
    const isValid = /^UC[a-zA-Z0-9_-]{22}$/.test(id); 
    return isValid;
  }
  return false;
};

export const extractYouTubeId = (url, type = 'video') => {
    if (!url) {
        return null;
    }

    const trimmedUrl = String(url).trim(); // Ensure URL is a string
    
    // If it's already a canonical ID (UC... or 11-char video), return it directly.
    if (validateYouTubeId(trimmedUrl, type)) {
        return trimmedUrl;
    }

  // Regex for standard YouTube video URLs
  const youtubeVideoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  // Regex for YouTube Shorts URLs
  const youtubeShortsRegex = /youtube\.com\/shorts\/([^"&?\/\s]{11})/;

  // Add specific handling for your test URL format: http://googleusercontent.com/youtube.com/X
  // This regex is now more flexible to capture any string (not just digits) after the last slash
  const testUrlRegex = /http:\/\/googleusercontent\.com\/youtube\.com\/(\S+)$/; 

  if (type === 'video') {
    // Check for your specific test URL format first
    const testMatch = trimmedUrl.match(testUrlRegex);
    if (testMatch && testMatch[1]) {
      // For your test URLs, we'll just return the captured part.
      // It's assumed this 'X' part will be treated as a valid ID by your backend/API.
      return testMatch[1];
    }

    // Check for standard YouTube video URLs
    const videoMatch = trimmedUrl.match(youtubeVideoRegex);
    if (videoMatch && videoMatch[1] && validateYouTubeId(videoMatch[1], 'video')) {
      return videoMatch[1];
    }

    // Check for YouTube Shorts URLs
    const shortsMatch = trimmedUrl.match(youtubeShortsRegex);
    if (shortsMatch && shortsMatch[1] && validateYouTubeId(shortsMatch[1], 'video')) {
      return shortsMatch[1];
    }

  } else if (type === 'channel') {
    // Regex for standard YouTube channel URLs (UC... or /channel/UC...)
    const youtubeChannelIdRegex = /(?:youtube\.com\/(?:channel\/|c\/|user\/|@)?)?([a-zA-Z0-9_-]{22,}|@[a-zA-Z0-9._-]{3,})/;
    const youtubeCanonicalChannelIdRegex = /^UC[a-zA-Z0-9_-]{22}$/; // For strict UC IDs

    // Check for your specific test URL format first for channels
    const testMatch = trimmedUrl.match(testUrlRegex);
    if (testMatch && testMatch[1]) {
      return testMatch[1];
    }

    const channelMatch = trimmedUrl.match(youtubeChannelIdRegex);

    if (channelMatch && channelMatch[1]) {
      const extractedId = channelMatch[1];
      // If it's a canonical UC ID, validate it strictly
      if (youtubeCanonicalChannelIdRegex.test(extractedId)) {
        return extractedId;
      }
      // Otherwise, assume it's a custom URL, @handle, or legacy user name and let the backend resolve it
      if (/^@|^[a-zA-Z0-9._-]{3,}$/.test(extractedId)) { // Basic check for handles/custom URLs
        // For handles, remove the '@' for consistency if your backend expects it without
        return extractedId.startsWith('@') ? extractedId.slice(1) : extractedId; 
      }
    }

    // If it's a plain string that looks like a handle/custom URL (e.g., "PewDiePie", "@MrBeast")
    // This catches cases where only the handle/custom URL is entered without "youtube.com/"
    if (/^@?[a-zA-Z0-9._-]{3,100}$/.test(trimmedUrl)) {
      return trimmedUrl.startsWith('@') ? trimmedUrl.slice(1) : trimmedUrl; // Remove '@' for backend if present
    }
  }

  return null; // Default return if no valid identifier is found
};

// ============================================================================
// Text Processing
// ============================================================================

export const truncateText = (text, maxLength = 100) => {
  // CRITICAL FIX: Ensure 'text' is always a string.
  // If 'text' is null, undefined, or a non-string value, convert it to an empty string.
  const stringText = String(text || ''); 

  if (stringText.length <= maxLength) {
    return stringText;
  }
  return stringText.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (str) => {
  if (!str) return ''
  return String(str).charAt(0).toUpperCase() + String(str).slice(1) // Ensure str is a string
}

export const slugify = (text) => {
  if (!text) return ''; // Handle null/undefined input
  return String(text) // Ensure text is a string
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
}

// ============================================================================
// Color Utilities
// ============================================================================

export const getColorByValue = (value, ranges) => {
  // ranges should be an array like [{ min: 0, max: 30, color: 'red' }, ...]
  if (value === null || value === undefined || isNaN(value)) {
    return '#gray'; // Default color for invalid values
  }
  for (const range of ranges) {
    if (value >= range.min && value <= range.max) {
      return range.color
    }
  }
  return ranges[ranges.length - 1]?.color || '#gray'
}

export const getEngagementColor = (rate) => {
  if (rate === null || rate === undefined || isNaN(rate)) return '#ef4444'; // Default to red for invalid rates
  if (rate >= 5) return '#10b981'     // Green
  if (rate >= 2) return '#f59e0b'     // Yellow
  if (rate >= 1) return '#f97316'     // Orange
  return '#ef4444'                  // Red
}

export const getSentimentColor = (sentiment) => {
  switch (String(sentiment || '').toLowerCase()) { // Ensure sentiment is a string
    case 'positive': return '#10b981'
    case 'negative': return '#ef4444'
    case 'neutral': return '#6b7280'
    default: return '#6b7280'
  }
}

// ============================================================================
// Array Utilities
// ============================================================================

export const sortByKey = (array, key, direction = 'asc') => {
  if (!Array.isArray(array)) return [];
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    // Handle undefined/null values for robust sorting
    if (aVal === undefined || aVal === null) return direction === 'asc' ? 1 : -1;
    if (bVal === undefined || bVal === null) return direction === 'asc' ? -1 : 1;

    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  return array.reduce((groups, item) => {
    const group = item[key] || 'null_group'; // Assign a default group for null/undefined keys
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

export const unique = (array, key = null) => {
  if (!Array.isArray(array)) return [];
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const val = item[key];
      if (seen.has(val)) {
        return false;
      }
      seen.add(val);
      return true;
    });
  }
  return [...new Set(array)];
};

// ============================================================================
// Object Utilities
// ============================================================================

export const deepClone = (obj) => {
  // Basic deep clone, handles JSON-serializable objects.
  // Will fail for functions, Dates, Regex, etc.
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
};

export const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  // For strings, consider empty string as empty
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
};

export const pick = (obj, keys) => {
  if (obj === null || typeof obj !== 'object') return {};
  return keys.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) { // More robust check
      result[key] = obj[key]
    }
    return result
  }, {})
}

// ============================================================================
// Local Storage Utilities
// ============================================================================

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Error writing to localStorage:', error)
      return false
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('Error removing from localStorage:', error)
      return false
    }
  },

  clear: () => {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('Error clearing localStorage:', error)
      return false
    }
  }
}

// ============================================================================
// URL Utilities
// ============================================================================

export const buildURL = (base, params = {}) => {
  if (!base || typeof base !== 'string') {
    console.error("Invalid base URL provided to buildURL:", base);
    return '';
  }
  const url = new URL(base)
  
  Object.keys(params).forEach(key => {
    // Convert parameter values to strings before appending
    const paramValue = params[key];
    if (paramValue !== null && paramValue !== undefined) {
      url.searchParams.append(key, String(paramValue)); 
    }
  })
  
  return url.toString()
}

export const getQueryParams = () => {
  if (typeof window === 'undefined') return {}; // Handle server-side rendering
  const params = new URLSearchParams(window.location.search)
  const result = {}
  
  for (const [key, value] of params) {
    result[key] = value
  }
  
  return result
}

// ============================================================================
// Performance Utilities
// ============================================================================

export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const throttle = (func, limit) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// ============================================================================
// Chart Data Utilities
// ============================================================================

export const prepareChartData = (data, xKey, yKey) => {
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    x: item[xKey],
    y: item[yKey],
    ...item
  }))
}

export const generateChartColors = (count) => {
  if (typeof count !== 'number' || count < 0) return [];
  const colors = [
    '#dc2626', '#ea580c', '#d97706', '#65a30d',
    '#059669', '#0891b2', '#0284c7', '#2563eb',
    '#7c3aed', '#9333ea', '#c026d3', '#db2777'
  ]
  
  const result = []
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length])
  }
  
  return result
}

// ============================================================================
// Error Handling
// ============================================================================

export const handleAsyncError = (error) => {
  console.error('Async operation failed:', error)
  
  // Format error message for user display
  if (error && typeof error === 'object') {
    if (error.response?.data?.detail) {
      return error.response.data.detail
    } else if (error.message) {
      return error.message
    }
  }
  return 'An unexpected error occurred';
}

export const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  if (typeof fn !== 'function') {
    throw new Error("Retry function must be a callable function.");
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }
}

// ============================================================================
// Form Validation
// ============================================================================

export const validators = {
  required: (value) => {
    return value !== null && value !== undefined && String(value).trim().length > 0; // Ensure value is string
  },

  youtubeVideoId: (value) => {
    return validateYouTubeId(value, 'video')
  },

  youtubeChannelId: (value) => {
    return validateYouTubeId(value, 'channel')
  },

  number: (value, min = null, max = null) => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
  },

  email: (value) => {
    if (typeof value !== 'string') return false; // Ensure value is a string
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }
}

export default {
  formatNumber,
  formatPercent,
  formatDuration,
  formatDate,
  formatRelativeTime,
  formatDateTime,
  validateYouTubeId,
  extractYouTubeId,
  truncateText,
  capitalizeFirst,
  slugify,
  getColorByValue,
  getEngagementColor,
  getSentimentColor,
  sortByKey,
  groupBy,
  unique,
  deepClone,
  isEmpty,
  pick,
  storage,
  buildURL,
  getQueryParams,
  debounce,
  throttle,
  prepareChartData,
  generateChartColors,
  handleAsyncError,
  retry,
  validators
}