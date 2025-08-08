<img width="1877" height="812" alt="Screenshot 2025-07-10 191458" src="https://github.com/user-attachments/assets/989cdb27-1157-48bf-8f8a-872dfcf0b452" />

# YouTube Analytics App

A comprehensive full-stack YouTube analytics dashboard built with React.js, Tailwind CSS, and FastAPI. Analyze YouTube channels and videos with advanced metrics, sentiment analysis, keyword extraction, and toxicity detection.

![YouTube Analytics Dashboard](https://img.shields.io/badge/YouTube-Analytics-red?style=for-the-badge&logo=youtube)
![React](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-green?style=for-the-badge&logo=fastapi)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.0-blue?style=for-the-badge&logo=tailwindcss)

## ✨ Features

### 🎯 Core Analytics
- **Channel Analysis**: Deep dive into channel metrics, growth trends, and content patterns
- **Video Analysis**: Comprehensive video insights with engagement and performance metrics
- **Trending Analysis**: Real-time trending videos with velocity tracking and category insights
- **Comparison Tools**: Side-by-side comparison of multiple channels or videos

### 🧠 Advanced Analytics
- **Sentiment Analysis**: VADER-powered comment sentiment analysis with distribution charts
- **Keyword Extraction**: KeyBERT-based keyword extraction from titles, descriptions, and comments
- **Toxicity Detection**: ML-powered toxicity detection for community health assessment
- **Upload Frequency Analysis**: Heatmap visualization of upload patterns by day and hour

### 📊 Visualizations
- **Interactive Charts**: Line charts, bar charts, pie charts, radar charts, and heatmaps
- **Word Clouds**: Dynamic keyword visualization with frequency-based sizing
- **Growth Trends**: Time-series analysis of channel and video performance
- **Engagement Metrics**: Comprehensive engagement rate calculations and comparisons

### 📈 Export & Reporting
- **CSV Export**: Download detailed reports for all analysis types
- **Multi-format Support**: Export individual sections or complete analysis reports
- **Session-based Storage**: Temporary data storage for quick exports and comparisons

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.8+ and pip
- **YouTube Data API v3 key** (free from Google Cloud Console)

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy your API key

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env
# Edit .env and add your YouTube API key:
# YOUTUBE_API_KEY=your_actual_api_key_here

# Run the FastAPI server
python run.py
or
uvicorn app.main:app
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
youtube-analytics-app/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── models/            # Data models and processors
│   │   ├── services/          # Business logic services
│   │   ├── routers/           # API route handlers
│   │   ├── utils/             # Utility functions
│   │   ├── config.py          # Application configuration
│   │   └── main.py            # FastAPI app entry point
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── run.py                # Server runner script
├── frontend/                  # React.js frontend
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API and utility services
│   │   ├── hooks/            # Custom React hooks
│   │   └── styles/           # CSS and styling
│   ├── package.json          # Node.js dependencies
│   └── vite.config.js        # Vite configuration
└── README.md                 # Project documentation
```

## 🎮 Usage Guide

### Channel Analysis
1. Navigate to **Channel Analysis**
2. Enter a YouTube channel URL or ID
3. Configure analysis options (video count, keywords, etc.)
4. Click **Analyze Channel**
5. Explore metrics, growth trends, and upload patterns
6. Export results as CSV

### Video Analysis
1. Go to **Video Analysis**
2. Enter a YouTube video URL or ID
3. Choose analysis depth (comments, sentiment, toxicity)
4. Click **Analyze Video**
5. Review engagement metrics and comment insights
6. Export detailed analysis reports

### Trending Analysis
1. Visit **Trending Analysis**
2. Select country and category filters
3. Click **Get Trending Videos**
4. Explore trending content and velocity metrics
5. Sort and filter results
6. Export trending data

### Comparison Tools
1. Access **Comparison** page
2. Choose to compare channels or videos
3. Add 2-5 YouTube URLs or IDs
4. Click **Compare**
5. Review side-by-side metrics and rankings
6. Export comparison results

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Required
YOUTUBE_API_KEY=your_api_key_here

# Optional
DEBUG=true
MAX_COMMENTS_PER_VIDEO=500
MAX_VIDEOS_PER_CHANNEL=50
SESSION_TIMEOUT=3600
```

### API Rate Limits

- YouTube Data API v3: 10,000 units/day (default quota)
- Comment analysis: Up to 500 comments per video
- Channel videos: Up to 50 recent videos per analysis

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **YouTube Data API v3**: Official YouTube data access
- **VADER Sentiment**: Comment sentiment analysis
- **KeyBERT**: Keyword extraction and analysis
- **Transformers**: ML-based toxicity detection
- **Pandas**: Data processing and analysis
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: Modern UI library with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Interactive chart library
- **React Router**: Client-side routing
- **React Hook Form**: Form handling
- **Axios**: HTTP client
- **Lucide React**: Icon library

## 📊 API Endpoints

### Channel Analysis
- `GET /api/channel/{channel_id}` - Analyze channel
- `GET /api/channel/{channel_id}/videos` - Get channel videos
- `GET /api/channel/{channel_id}/export` - Export analysis

### Video Analysis
- `GET /api/video/{video_id}` - Analyze video
- `GET /api/video/{video_id}/comments` - Get video comments
- `GET /api/video/{video_id}/sentiment` - Sentiment analysis
- `GET /api/video/{video_id}/export` - Export analysis

### Trending Analysis
- `GET /api/trending` - Get trending videos
- `GET /api/trending/categories` - Available categories
- `GET /api/trending/export` - Export trending data

### Comparison
- `POST /api/compare/channels` - Compare channels
- `POST /api/compare/videos` - Compare videos
- `GET /api/compare/*/export` - Export comparisons

## 🔍 Analysis Features

### Metrics Calculated
- **Engagement Rate**: (Likes + Comments) / Views × 100
- **View Velocity**: Views per hour since publication
- **Growth Trends**: Cumulative metrics over time
- **Upload Frequency**: Day/hour heatmap patterns
- **Performance Score**: Composite performance rating

### Sentiment Analysis
- **VADER Sentiment**: Positive, negative, neutral classification
- **Sentiment Trends**: Time-based sentiment changes
- **Polarization Index**: Community opinion distribution
- **Engagement Correlation**: Sentiment vs. engagement patterns

### Keyword Extraction
- **KeyBERT**: Transformer-based keyword extraction
- **Frequency Analysis**: Word occurrence counting
- **Tag Analysis**: Video tag pattern identification
- **Topic Modeling**: Content theme identification

## 🚨 Troubleshooting

### Common Issues

**API Key Not Working**
- Verify YouTube Data API v3 is enabled
- Check API key is correctly set in `.env`
- Ensure no extra spaces in the API key

**Backend Connection Error**
- Confirm backend is running on port 8000
- Check Python virtual environment is activated
- Verify all dependencies are installed

**Rate Limit Exceeded**
- YouTube API quota exceeded (10,000 units/day)
- Wait for quota reset or request quota increase
- Reduce analysis scope (fewer videos/comments)

**Missing Data**
- Channel/video might be private or deleted
- Some metrics may not be available for all content
- API responses can vary based on privacy settings

## 📝 Development

### Running in Development

```bash
# Backend with auto-reload
cd backend
python run.py

# Frontend with hot reload
cd frontend
npm run dev
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend with production settings
cd backend
# Set DEBUG=false in .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **YouTube Data API v3** for comprehensive video platform data
- **VADER Sentiment Analysis** for comment sentiment processing
- **KeyBERT** for advanced keyword extraction
- **Recharts** for beautiful, responsive data visualizations
- **Tailwind CSS** for rapid UI development
- **FastAPI** for modern, fast Python web framework

## 📞 Support

- 📖 **Documentation**: Check this README and inline code comments
- 🐛 **Bug Reports**: Open an issue with detailed reproduction steps
- 💡 **Feature Requests**: Suggest improvements via GitHub issues
- 💬 **Discussions**: Use GitHub Discussions for questions

## Some Images from the Project
<img width="1872" height="715" alt="Screenshot 2025-07-10 191429" src="https://github.com/user-attachments/assets/1f595522-2503-4413-ad07-9473b66dc17a" />
<img width="1870" height="802" alt="Screenshot 2025-07-10 191347" src="https://github.com/user-attachments/assets/0f612489-3e43-472f-8d31-5931514d7e96" />
<img width="1889" height="811" alt="Screenshot 2025-07-10 191242" src="https://github.com/user-attachments/assets/838bb00d-7151-4381-bfde-2e3e0ce7c661" />
<img width="1885" height="641" alt="Screenshot 2025-07-10 191151" src="https://github.com/user-attachments/assets/f87520a6-2d6e-4243-9f3b-e166ccfd8804" />
<img width="1876" height="710" alt="Screenshot 2025-07-10 191135" src="https://github.com/user-attachments/assets/a268fd80-b9a6-49b8-8bd7-1c4369e362c0" />
<img width="1918" height="681" alt="Screenshot 2025-07-10 191120" src="https://github.com/user-attachments/assets/01e534fc-1d68-496a-aa2e-c37fda2f20fd" />
<img width="1892" height="832" alt="Screenshot 2025-07-10 191050" src="https://github.com/user-attachments/assets/347cf917-239a-49bf-b741-6e17bf4dc146" />
<img width="1858" height="678" alt="Screenshot 2025-07-10 191514" src="https://github.com/user-attachments/assets/fccbe8b7-c033-4d1d-bd7b-9d0be0ec0f5b" />


**Built with ❤️ for YouTube content creators and analysts**
