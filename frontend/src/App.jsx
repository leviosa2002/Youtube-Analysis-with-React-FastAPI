import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Layout Components
import Header from './components/common/Header'
import Sidebar from './components/common/Sidebar'

// Page Components
import Dashboard from './pages/Dashboard'
import ChannelPage from './pages/ChannelPage'
import VideoPage from './pages/VideoPage'
import TrendingPage from './pages/TrendingPage'
import ComparisonPage from './pages/ComparisonPage'

// Common Components
import ErrorMessage from './components/common/ErrorMessage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Header />
        
        <div className="flex">
          {/* Sidebar */}
          {/* <Sidebar /> */}
          
          {/* Main Content */}
          <main className="flex-1">
            <div className="container-app py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/channel" element={<ChannelPage />} />
                <Route path="/video" element={<VideoPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
                <Route 
                  path="*" 
                  element={
                    <div className="text-center py-12">
                      <ErrorMessage 
                        title="Page Not Found"
                        message="The page you're looking for doesn't exist."
                      />
                    </div>
                  } 
                />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App