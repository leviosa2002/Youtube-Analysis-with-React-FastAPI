import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Youtube, 
  Video, 
  TrendingUp, 
  GitCompare, 
  BarChart3,
  Users,
  MessageSquare,
  Download,
  Clock
} from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      description: 'Overview & Quick Actions'
    },
    {
      name: 'Channel Analysis',
      href: '/channel',
      icon: Youtube,
      description: 'Deep dive into channel metrics'
    },
    {
      name: 'Video Analysis',
      href: '/video',
      icon: Video,
      description: 'Comprehensive video insights'
    },
    {
      name: 'Trending Analysis',
      href: '/trending',
      icon: TrendingUp,
      description: 'Latest trending videos'
    },
    {
      name: 'Comparison',
      href: '/comparison',
      icon: GitCompare,
      description: 'Compare channels & videos'
    }
  ]

  const quickStats = [
    { label: 'Total Analyses', value: '156', icon: BarChart3 },
    { label: 'Channels Tracked', value: '42', icon: Users },
    { label: 'Comments Analyzed', value: '12.3K', icon: MessageSquare },
    { label: 'Reports Generated', value: '28', icon: Download }
  ]

  const isCurrentPath = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto scrollbar-thin">
      <div className="p-6">
        {/* Main Navigation */}
        <nav className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Analytics Tools
          </h3>
          
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = isCurrentPath(item.href)
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-start p-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-youtube-red text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-youtube-red'
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-youtube-red'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className={`text-xs mt-0.5 ${
                    isActive ? 'text-red-100' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Quick Stats */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Session Stats
          </h3>
          
          <div className="space-y-3">
            {quickStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900">Channel analysis completed</p>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  2 minutes ago
                </p>
              </div>
            </div>
            
            <div className="flex items-start p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900">Video sentiment analyzed</p>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  5 minutes ago
                </p>
              </div>
            </div>
            
            <div className="flex items-start p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900">Report exported</p>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  10 minutes ago
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-gradient-to-r from-youtube-red to-red-600 rounded-lg p-4 text-white">
            <h4 className="text-sm font-medium mb-2">Need Help?</h4>
            <p className="text-xs text-red-100 mb-3">
              Check out our documentation for detailed guides and examples.
            </p>
            <button className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded transition-colors">
              View Docs
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar