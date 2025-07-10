import React, { useEffect, useRef, useState } from 'react'
import { formatNumber } from '../../services/utils'

const WordCloud = ({
  words = [],
  width = 400,
  height = 300,
  title = '',
  subtitle = '',
  maxWords = 50,
  colorScheme = 'youtube', // 'youtube', 'blue', 'green', 'rainbow'
  className = ''
}) => {

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width, height })

  // Color schemes
  const colorSchemes = {
    youtube: ['#dc2626', '#ea580c', '#f97316', '#d97706', '#ca8a04'],
    blue: ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
    green: ['#166534', '#16a34a', '#22c55e', '#4ade80', '#86efac'],
    rainbow: ['#dc2626', '#ea580c', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
  }

  // Process words data
  const processedWords = words
    .filter(word => word.keyword && (word.count > 0 || word.relevance_score > 0))
    .sort((a, b) => (b.count || b.relevance_score || 0) - (a.count || a.relevance_score || 0))
    .slice(0, maxWords)
    .map(word => ({
      text: word.keyword,
      size: word.count || Math.round((word.relevance_score || 0) * 100),
      count: word.count || 0,
      relevance: word.relevance_score || 0,
      type: word.type || 'keyword'
    }))


  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: Math.max(300, rect.width - 48), // Account for padding
          height: height
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [height])

  // Simple word cloud layout algorithm
  useEffect(() => {
    if (!processedWords.length || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width: canvasWidth, height: canvasHeight } = dimensions

    // Set canvas size
    canvas.width = canvasWidth * window.devicePixelRatio
    canvas.height = canvasHeight * window.devicePixelRatio
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Calculate font sizes
    const maxSize = Math.max(...processedWords.map(w => w.size))
    const minSize = Math.min(...processedWords.map(w => w.size))
    const sizeRange = maxSize - minSize || 1

    const maxFontSize = Math.min(canvasWidth, canvasHeight) * 0.08
    const minFontSize = Math.min(canvasWidth, canvasHeight) * 0.02

    // Layout words in a simple spiral pattern
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const colors = colorSchemes[colorScheme] || colorSchemes.youtube
    const placedWords = []

    processedWords.forEach((word, index) => {
      // Calculate font size
      const normalizedSize = (word.size - minSize) / sizeRange
      const fontSize = minFontSize + normalizedSize * (maxFontSize - minFontSize)
      
      ctx.font = `${Math.round(fontSize)}px Inter, sans-serif`
      ctx.fillStyle = colors[index % colors.length]
      
      // Measure text
      const metrics = ctx.measureText(word.text)
      const textWidth = metrics.width
      const textHeight = fontSize

      // Simple placement algorithm (spiral)
      let placed = false
      let attempts = 0
      let radius = 0
      const maxAttempts = 50

      while (!placed && attempts < maxAttempts) {
        const angle = (attempts * 0.5) % (2 * Math.PI)
        const x = centerX + Math.cos(angle) * radius - textWidth / 2
        const y = centerY + Math.sin(angle) * radius + textHeight / 2

        // Check bounds
        if (x >= 0 && x + textWidth <= canvasWidth && 
            y - textHeight >= 0 && y <= canvasHeight) {
          
          // Check collision with other words
          const wordBounds = {
            x: x - 5,
            y: y - textHeight - 5,
            width: textWidth + 10,
            height: textHeight + 10
          }

          const hasCollision = placedWords.some(placed => 
            wordBounds.x < placed.x + placed.width &&
            wordBounds.x + wordBounds.width > placed.x &&
            wordBounds.y < placed.y + placed.height &&
            wordBounds.y + wordBounds.height > placed.y
          )

          if (!hasCollision) {
            // Place the word
            ctx.fillText(word.text, x, y)
            placedWords.push(wordBounds)
            placed = true
          }
        }

        attempts++
        radius += 2
      }
    })
  }, [processedWords, dimensions, colorScheme])

  if (!words || words.length === 0) {
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
            <p className="text-sm">No keywords available</p>
            <p className="text-xs mt-1">Word cloud will appear when data is loaded</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`} ref={containerRef}>
      {title && (
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-200 rounded-lg bg-gray-50"
          style={{ maxWidth: '100%' }}
        />
        
        {/* Word count indicator */}
        <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600">
          {processedWords.length} words
        </div>
      </div>

      {/* Top words list */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Top Keywords</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {processedWords.slice(0, 9).map((word, index) => (
            <div key={word.text} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="font-medium truncate">{word.text}</span>
              <span className="text-gray-500 ml-2">
                {word.count > 0 ? formatNumber(word.count) : `${(word.relevance * 100).toFixed(0)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Specialized word clouds for different contexts
export const KeywordWordCloud = ({ keywords , title = "Keywords Analysis" }) => {
  return (
    <WordCloud
      words={keywords}
      title={title}
      colorScheme="youtube"
      height={300}
    />
  )
}

export const TagsWordCloud = ({ tags, title = "Popular Tags" }) => {
  // Transform tags array to word cloud format
  const tagData = tags.map(tag => ({
    keyword: tag.keyword || tag,
    count: tag.count || 1,
    type: 'tag'
  }))

  return (
    <WordCloud
      words={tagData}
      title={title}
      colorScheme="blue"
      height={250}
      maxWords={30}
    />
  )
}

export const TitleWordCloud = ({ titles, title = "Common Title Words" }) => {
  // Extract words from titles and count frequency
  const wordCounts = {}
  
  titles.forEach(title => {
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter short words
    
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })
  })

  const wordData = Object.entries(wordCounts)
    .map(([word, count]) => ({
      keyword: word,
      count,
      type: 'title'
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <WordCloud
      words={wordData}
      title={title}
      colorScheme="green"
      height={280}
      maxWords={40}
    />
  )
}

export const CommentWordCloud = ({ comments, title = "Comment Keywords" }) => {
  // Extract meaningful words from comments
  const wordCounts = {}
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
    'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ])

  comments.forEach(comment => {
    const words = comment.text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
    
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })
  })

  const wordData = Object.entries(wordCounts)
    .map(([word, count]) => ({
      keyword: word,
      count,
      type: 'comment'
    }))
    .filter(item => item.count > 1) // Filter words that appear only once
    .sort((a, b) => b.count - a.count)

  return (
    <WordCloud
      words={wordData}
      title={title}
      colorScheme="rainbow"
      height={300}
      maxWords={35}
    />
  )
}

// Interactive word cloud with click handlers
export const InteractiveWordCloud = ({ 
  words, 
  title, 
  onWordClick = null,
  selectedWords = [],
  ...props 
}) => {
  const handleCanvasClick = (event) => {
    if (!onWordClick) return
    
  }

  return (
    <div className="relative">
      <WordCloud
        words={words}
        title={title}
        {...props}
      />
      
      {onWordClick && (
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={handleCanvasClick}
          title="Click on words to select them"
        />
      )}
      
      {selectedWords.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded">
          <p className="text-xs text-blue-800">
            Selected: {selectedWords.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

export default WordCloud