import { format } from 'date-fns'

/**
 * CSV Export Service for YouTube Analytics data
 */

// Helper function to escape CSV values
const escapeCSVValue = (value) => {
  if (value === null || value === undefined) return ''
  
  const stringValue = String(value)
  
  // If the value contains comma, quotes, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

// Convert array of objects to CSV string
const arrayToCSV = (data, headers = null) => {
  if (!data || data.length === 0) return ''
  
  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0])
  
  // Create header row
  const headerRow = csvHeaders.map(escapeCSVValue).join(',')
  
  // Create data rows
  const dataRows = data.map(row => 
    csvHeaders.map(header => escapeCSVValue(row[header])).join(',')
  )
  
  return [headerRow, ...dataRows].join('\n')
}

// Download CSV file
const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// ============================================================================
// Channel Data Export Functions
// ============================================================================

export const exportChannelData = {
  // Export channel basic info
  channelInfo: (channelData) => {
    const data = [{
      'Channel ID': channelData.id,
      'Channel Name': channelData.title,
      'Subscriber Count': channelData.subscriber_count,
      'Total Views': channelData.view_count,
      'Video Count': channelData.video_count,
      'Country': channelData.country || 'N/A',
      'Created Date': channelData.published_at ? format(new Date(channelData.published_at), 'yyyy-MM-dd') : 'N/A',
      'Custom URL': channelData.custom_url || 'N/A',
      'Description': channelData.description || 'N/A'
    }]
    
    const csv = arrayToCSV(data)
    const filename = `channel_info_${channelData.id}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export channel videos
  channelVideos: (videos, channelId) => {
    const data = videos.map(video => ({
      'Video ID': video.id,
      'Title': video.title,
      'Published Date': format(new Date(video.published_at), 'yyyy-MM-dd HH:mm'),
      'Views': video.view_count,
      'Likes': video.like_count,
      'Comments': video.comment_count,
      'Duration': video.duration_formatted,
      'Duration (seconds)': video.duration_seconds,
      'Duration Category': video.duration_category,
      'Engagement Rate (%)': video.engagement_rate,
      'Tags': Array.isArray(video.tags) ? video.tags.join('; ') : 'N/A'
    }))
    
    const csv = arrayToCSV(data)
    const filename = `channel_videos_${channelId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export growth data
  growthData: (growthData, channelId) => {
    const data = growthData.map(point => ({
      'Date': point.date,
      'Cumulative Views': point.cumulative_views,
      'Video Count': point.video_count,
      'Monthly Views': point.monthly_views
    }))
    
    const csv = arrayToCSV(data)
    const filename = `channel_growth_${channelId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export keywords
  keywords: (keywords, channelId) => {
    const data = keywords.map(keyword => ({
      'Keyword': keyword.keyword,
      'Count': keyword.count,
      'Type': keyword.type,
      'Percentage': keyword.percentage,
      'Relevance Score': keyword.relevance_score || 'N/A'
    }))
    
    const csv = arrayToCSV(data)
    const filename = `channel_keywords_${channelId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  }
}

// ============================================================================
// Video Data Export Functions
// ============================================================================

export const exportVideoData = {
  // Export video info
  videoInfo: (videoData) => {
    const data = [{
      'Video ID': videoData.id,
      'Title': videoData.title,
      'Channel': videoData.channel_title,
      'Published Date': format(new Date(videoData.published_at), 'yyyy-MM-dd HH:mm'),
      'Views': videoData.view_count,
      'Likes': videoData.like_count,
      'Comments': videoData.comment_count,
      'Duration': videoData.duration,
      'Tags': Array.isArray(videoData.tags) ? videoData.tags.join('; ') : 'N/A',
      'Description': videoData.description || 'N/A'
    }]
    
    const csv = arrayToCSV(data)
    const filename = `video_info_${videoData.id}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export comments
  comments: (comments, videoId) => {
    const data = comments.map(comment => ({
      'Comment ID': comment.id,
      'Author': comment.author,
      'Text': comment.text,
      'Published Date': format(new Date(comment.published_at), 'yyyy-MM-dd HH:mm'),
      'Likes': comment.like_count,
      'Replies': comment.reply_count,
      'Text Length': comment.text_length
    }))
    
    const csv = arrayToCSV(data)
    const filename = `video_comments_${videoId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export sentiment analysis
  sentimentAnalysis: (sentimentData, videoId) => {
    const data = [{
      'Video ID': videoId,
      'Total Comments Analyzed': sentimentData.total_comments_analyzed,
      'Positive Comments': sentimentData.sentiment_distribution.positive,
      'Negative Comments': sentimentData.sentiment_distribution.negative,
      'Neutral Comments': sentimentData.sentiment_distribution.neutral,
      'Positive Percentage': sentimentData.sentiment_percentages.positive,
      'Negative Percentage': sentimentData.sentiment_percentages.negative,
      'Neutral Percentage': sentimentData.sentiment_percentages.neutral,
      'Overall Sentiment': sentimentData.overall_sentiment,
      'Sentiment Strength': sentimentData.sentiment_strength,
      'Compound Score': sentimentData.sentiment_scores.compound,
      'Polarization Index': sentimentData.polarization_index
    }]
    
    const csv = arrayToCSV(data)
    const filename = `video_sentiment_${videoId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export toxicity analysis
  toxicityAnalysis: (toxicityData, videoId) => {
    const data = [{
      'Video ID': videoId,
      'Total Comments Analyzed': toxicityData.total_comments_analyzed,
      'Toxic Comments Count': toxicityData.toxic_comments_count,
      'Toxicity Rate (%)': toxicityData.toxicity_rate,
      'Average Toxicity Score': toxicityData.avg_toxicity_score,
      'High Toxicity Comments': toxicityData.toxicity_levels.high,
      'Medium Toxicity Comments': toxicityData.toxicity_levels.medium,
      'Low Toxicity Comments': toxicityData.toxicity_levels.low,
      'Community Health Score': toxicityData.community_health_score.score,
      'Health Level': toxicityData.community_health_score.level
    }]
    
    const csv = arrayToCSV(data)
    const filename = `video_toxicity_${videoId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  }
}

// ============================================================================
// Trending Data Export Functions
// ============================================================================

export const exportTrendingData = {
  // Export trending videos
  trendingVideos: (videos, country) => {
    const data = videos.map(video => ({
      'Video ID': video.id,
      'Title': video.title,
      'Channel': video.channel_title,
      'Published Date': format(new Date(video.published_at), 'yyyy-MM-dd HH:mm'),
      'Views': video.view_count,
      'Likes': video.like_count,
      'Comments': video.comment_count,
      'Category': video.category_name || video.category_id,
      'Duration': video.duration_formatted,
      'Engagement Rate (%)': video.engagement_rate,
      'Country': country
    }))
    
    const csv = arrayToCSV(data)
    const filename = `trending_videos_${country}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export velocity data
  velocityData: (velocityData, country) => {
    const data = velocityData.map(item => ({
      'Video ID': item.video_id,
      'Title': item.title,
      'Total Views': item.total_views,
      'Views per Hour': Math.round(item.views_per_hour),
      'Views per Day': Math.round(item.views_per_day),
      'Hours Since Publish': Math.round(item.hours_since_publish)
    }))
    
    const csv = arrayToCSV(data)
    const filename = `trending_velocity_${country}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  }
}

// ============================================================================
// Comparison Data Export Functions
// ============================================================================

export const exportComparisonData = {
  // Export channel comparison
  channelComparison: (comparisonData) => {
    const data = comparisonData.channels.map((channel, index) => ({
      'Channel ID': channel.id,
      'Channel Name': channel.title,
      'Subscribers': channel.subscriber_count,
      'Total Views': channel.view_count,
      'Video Count': channel.video_count,
      'Country': channel.country || 'N/A',
      'Created Date': channel.published_at ? format(new Date(channel.published_at), 'yyyy-MM-dd') : 'N/A',
      'Avg Views per Video': Math.round(comparisonData.comparison_metrics.avg_views_per_video[index]),
      'Channel Age (days)': Math.round(comparisonData.comparison_metrics.channel_age_days[index])
    }))
    
    const csv = arrayToCSV(data)
    const filename = `channel_comparison_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  },

  // Export video comparison
  videoComparison: (comparisonData) => {
    const data = comparisonData.videos.map((video, index) => ({
      'Video ID': video.id,
      'Title': video.title,
      'Channel': video.channel_title,
      'Views': video.view_count,
      'Likes': video.like_count,
      'Comments': video.comment_count,
      'Duration': video.duration,
      'Published Date': format(new Date(video.published_at), 'yyyy-MM-dd HH:mm'),
      'Engagement Rate (%)': comparisonData.comparison_metrics.engagement_rates[index],
      'Views per Hour': Math.round(comparisonData.engagement_comparison.views_per_hour[index])
    }))
    
    const csv = arrayToCSV(data)
    const filename = `video_comparison_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    downloadCSV(csv, filename)
  }
}

// ============================================================================
// Generic Export Function
// ============================================================================

export const exportGenericData = (data, filename, headers = null) => {
  const csv = arrayToCSV(data, headers)
  const timestampedFilename = `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
  downloadCSV(csv, timestampedFilename)
}

// ============================================================================
// Export All Data (Combined)
// ============================================================================

export const exportAllData = (analysisData, type) => {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss')
  
  if (type === 'channel' && analysisData.channel_info) {
    // Create combined channel data
    const combinedData = []
    
    // Add channel info section
    combinedData.push(['=== CHANNEL INFORMATION ==='])
    combinedData.push(['Channel ID', analysisData.channel_info.id])
    combinedData.push(['Channel Name', analysisData.channel_info.title])
    combinedData.push(['Subscribers', analysisData.channel_info.subscriber_count])
    combinedData.push(['Total Views', analysisData.channel_info.view_count])
    combinedData.push(['Video Count', analysisData.channel_info.video_count])
    combinedData.push([''])
    
    // Add recent videos if available
    if (analysisData.recent_videos?.length > 0) {
      combinedData.push(['=== RECENT VIDEOS ==='])
      combinedData.push(['Title', 'Views', 'Likes', 'Comments', 'Duration', 'Published'])
      
      analysisData.recent_videos.forEach(video => {
        combinedData.push([
          video.title,
          video.view_count,
          video.like_count,
          video.comment_count,
          video.duration_formatted,
          format(new Date(video.published_at), 'yyyy-MM-dd')
        ])
      })
    }
    
    const csv = combinedData.map(row => row.map(escapeCSVValue).join(',')).join('\n')
    downloadCSV(csv, `channel_complete_analysis_${timestamp}.csv`)
  }
}