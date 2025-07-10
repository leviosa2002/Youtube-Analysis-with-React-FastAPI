import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Youtube, BarChart3, Settings, HelpCircle } from 'lucide-react'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Channel Analysis', href: '/channel', icon: Youtube },
    { name: 'Video Analysis', href: '/video', icon: Youtube },
    { name: 'Trending', href: '/trending', icon: BarChart3 },
    { name: 'Comparison', href: '/comparison', icon: BarChart3 },
  ]

  const isCurrentPath = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header className="bg-white shadow-soft border-b border-gray-200 sticky top-0 z-40">
      <div className="container-app">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-youtube-red rounded-lg flex items-center justify-center">
                <Youtube className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">YouTube Analytics</h1>
                <p className="text-xs text-gray-500">Professional Insights</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = isCurrentPath(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive ? 'nav-link-active' : 'nav-link-inactive'
                  } px-3 py-2`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center space-x-3">
            {/* Help button */}
            <button
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Help & Documentation"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Settings button */}
            <button
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = isCurrentPath(item.href)
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive ? 'nav-link-active' : 'nav-link-inactive'
                    } block px-3 py-2`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header