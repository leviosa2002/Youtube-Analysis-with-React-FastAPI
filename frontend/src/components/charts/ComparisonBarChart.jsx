import React, { useState } from 'react'; // <-- Imported useState
import { formatNumber, truncateText } from '../../services/utils';

const ComparisonBarChart = ({ data, metricKey, title, comparisonType }) => {
  const [hoveredItem, setHoveredItem] = useState(null); // <-- Added state for hover

  if (!data || data.length === 0) {
    return null;
  }

  const values = data.map(item => item[metricKey]);
  const maxValue = Math.max(...values);

  const getMetricTitle = () => {
    switch (metricKey) {
      case 'subscriber_count': return 'Subscribers';
      case 'view_count': return 'Views';
      case 'video_count': return 'Videos';
      case 'like_count': return 'Likes';
      case 'comment_count': return 'Comments';
      case 'avg_views_per_video': return 'Avg. Views/Video';
      default: return metricKey;
    }
  };

  const getLink = (item) => {
    if (comparisonType === 'channels') {
      return `https://www.youtube.com/channel/${item.id}`;
    }
    if (comparisonType === 'videos') {
      return `https://www.youtube.com/watch?v=${item.id}`;
    }
    return '#';
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const value = item[metricKey];
          const percentage = (value / maxValue) * 100;
          const label = item.title || item.name;

          return (
            <a 
              key={item.id} 
              href={getLink(item)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-4 group cursor-pointer"
              onMouseEnter={() => setHoveredItem(item)} // <-- Added hover handler
              onMouseLeave={() => setHoveredItem(null)} // <-- Added hover handler
            >
              <div className="w-1/4">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {truncateText(label, 20)}
                </p>
                <p className="text-xs text-gray-500">{formatNumber(value)} {getMetricTitle()}</p>
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                <div
                  className="bg-youtube-red h-full rounded-full transition-all duration-500 ease-out transform group-hover:scale-x-105" // <-- Added hover effect
                  style={{ width: `${percentage}%` }}
                />
                {/* Tooltip */}
                {hoveredItem?.id === item.id && (
                  <div className="absolute left-1/2 -top-10 -translate-x-1/2 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                    {formatNumber(value)}
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonBarChart;