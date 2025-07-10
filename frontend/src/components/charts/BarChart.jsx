import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatNumber, truncateText } from '../../services/utils';

const BarChart = ({
  data = [],
  xDataKey = 'name', // This will now be used by YAxis (categories)
  yDataKey = 'value', // This will now be used by XAxis (numbers)
  bars = [],
  title = '',
  subtitle = '',
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669'],
  formatXAxis = null, // Will now format numerical X-axis
  formatYAxis = null, // Will now format categorical Y-axis
  layout = 'horizontal', // Prop defaults to horizontal to align with visual behavior
  className = ''
}) => {
  const defaultBars = bars.length > 0 ? bars : [
    {
      dataKey: yDataKey, // This is still the numerical dataKey for the bar length
      name: 'Value',
      color: colors[0]
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    // For horizontal charts, 'label' usually comes from the categorical axis (now Y-axis)
    const formattedLabel = formatYAxis ? formatYAxis(label) : truncateText(String(label), 30);

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {formattedLabel}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">
              {/* This is for the numerical value, so it should use formatXAxis now */}
              {formatXAxis ? formatXAxis(entry.value) : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Custom X-axis tick formatter (now for NUMBERS)
  const formatXAxisTick = (value) => {
    if (formatXAxis) return formatXAxis(value);
    return formatNumber(value);
  };

  // Custom Y-axis tick formatter (now for CATEGORIES)
  const formatYAxisTick = (value) => {
    if (formatYAxis) return formatYAxis(value);
    return truncateText(String(value), 15);
  };

  if (!data || data.length === 0) {
    return (
      <div className={`card ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p className="text-sm">No data available</p>
            <p className="text-xs mt-1">Chart will appear when data is loaded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout="horizontal" // Explicitly set to horizontal
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f3f4f6"
              strokeOpacity={0.8}
            />
          )}
          
          {/* XAxis for Horizontal Layout: Number Type, for values */}
          <XAxis
            type="number"       // Numbers on the X-axis for horizontal bars
            tickFormatter={formatXAxisTick} 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickCount={5} 
            domain={[0, (dataMax) => dataMax * 1.1]} 
          />
          
          {/* YAxis for Horizontal Layout: Category Type, for labels */}
          <YAxis
            dataKey={xDataKey} // This should be 'name' (categories)
            type="category"     // Categories on the Y-axis for horizontal bars
            tickFormatter={formatYAxisTick} 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={80} // Give some width for the channel names
            interval={0} 
            padding={{ top: 10, bottom: 10 }}
          />
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
            />
          )}
          
          {defaultBars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey} 
              name={bar.name}
              fill={bar.color || colors[index % colors.length]}
              radius={bar.radius || [0, 5, 5, 0]} // Rounded rectangles on right side for horizontal bars
              barSize={40} 
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Specialized Bar Charts (using the generic BarChart component)

export const EngagementBarChart = ({ data, title = "Video Engagement Comparison" }) => {
  const bars = [
    { dataKey: 'views', name: 'Views', color: '#3b82f6' },
    { dataKey: 'likes', name: 'Likes', color: '#10b981' },
    { dataKey: 'comments', name: 'Comments', color: '#f59e0b' }
  ];

  const chartData = data.map(item => ({
    ...item,
    title: truncateText(String(item.title), 20),
    views: Number(item.views) || 0,
    likes: Number(item.likes) || 0,
    comments: Number(item.comments) || 0,
  }));

  return (
    <BarChart
      data={chartData}
      xDataKey="title" // This will now be the YAxis (category)
      bars={bars}
      title={title}
      height={350}
      layout="horizontal"
      formatXAxis={(value) => formatNumber(value)} // XAxis is now numerical
      formatYAxis={(value) => truncateText(value, 15)} // YAxis is now categorical
    />
  );
};

export const CategoryBarChart = ({ data, title = "Category Distribution" }) => {
    const chartData = data.map(item => ({
      ...item,
      category: String(item.category),
      count: Number(item.count) || 0, 
    }));

  return (
    <BarChart
      data={chartData}
      xDataKey="category" // This will now be the YAxis (category)
      yDataKey="count" // This will now be the XAxis (numerical)
      title={title}
      height={300}
      layout="horizontal"
      colors={['#8b5cf6']}
      formatXAxis={(value) => formatNumber(value)} // XAxis is now numerical
      formatYAxis={(value) => truncateText(value, 15)} // YAxis is now categorical
    />
  );
};

export const KeywordsBarChart = ({ data, title = "Top Keywords" }) => {
  const chartData = data.map(item => ({
    keyword: truncateText(String(item.keyword), 20),
    count: Number(item.count || item.occurrence_count) || 0,
    type: String(item.type || 'keyword')
  }));

  return (
    <BarChart
      data={chartData}
      xDataKey="keyword" // This will now be the YAxis (category)
      yDataKey="count" // This will now be the XAxis (numerical)
      title={title}
      height={Math.max(300, chartData.length * 25)}
      layout="horizontal"
      colors={['#dc2626']}
      formatXAxis={(value) => formatNumber(value)} // XAxis is now numerical
      formatYAxis={(value) => truncateText(value, 20)} // YAxis is now categorical
    />
  );
};

export const ChannelComparisonBarChart = ({ data, metric = 'subscriber_count', title }) => {
  const metricConfig = {
    subscriber_count: { name: 'Subscribers', color: '#dc2626' },
    view_count: { name: 'Total Views', color: '#2563eb' },
    video_count: { name: 'Videos', color: '#059669' },
    avg_views_per_video: { name: 'Avg Views/Video', color: '#d97706' }
  };

  const config = metricConfig[metric] || metricConfig.subscriber_count;
  const chartTitle = title || `Channel Comparison - ${config.name}`;

  const chartData = data.map(channel => ({
    name: truncateText(String(channel.title), 20),
    value: Number(channel[metric]) || 0,
    fullName: channel.title
  }));

  return (
    <BarChart
      data={chartData}
      xDataKey="name" // This will now be the YAxis (category)
      yDataKey="value" // This will now be the XAxis (numerical)
      title={chartTitle}
      height={350}
      layout="horizontal"
      colors={[config.color]}
      formatXAxis={(value) => formatNumber(value)} // XAxis is now numerical
      formatYAxis={(value) => truncateText(value, 15)} // YAxis is now categorical
    />
  );
};

export const VideoComparisonBarChart = ({ data, metric = 'view_count', title }) => {
  const metricConfig = {
    view_count: { name: 'Views', color: '#3b82f6' },
    like_count: { name: 'Likes', color: '#10b981' },
    comment_count: { name: 'Comments', color: '#f59e0b' },
    engagement_rate: { name: 'Engagement Rate (%)', color: '#8b5cf6' }
  };

  const config = metricConfig[metric] || metricConfig.view_count;
  const chartTitle = title || `Video Comparison - ${config.name}`;

  const chartData = data.map(video => ({
    name: truncateText(String(video.title), 25),
    value: Number(video[metric]) || 0,
    fullName: video.title
  }));

  return (
    <BarChart
      data={chartData}
      xDataKey="name" // This will now be the YAxis (category)
      yDataKey="value" // This will now be the XAxis (numerical)
      title={chartTitle}
      height={400}
      layout="horizontal"
      colors={[config.color]}
      formatXAxis={(value) => // XAxis is now numerical
        metric === 'engagement_rate' 
          ? `${Number(value).toFixed(2)}%` 
          : formatNumber(value)
      }
      formatYAxis={(value) => truncateText(value, 15)} // YAxis is now categorical
    />
  );
};

export const SentimentBarChart = ({ data, title = "Comment Sentiment Distribution" }) => {
    const positive = Number(data?.positive) || 0;
    const negative = Number(data?.negative) || 0;
    const neutral = Number(data?.neutral) || 0;
    const total = positive + negative + neutral;

  const sentimentData = [
    {
      sentiment: 'Positive',
      count: positive,
      percentage: total > 0 ? ((positive / total) * 100).toFixed(1) : '0.0'
    },
    {
      sentiment: 'Neutral',
      count: neutral,
      percentage: total > 0 ? ((neutral / total) * 100).toFixed(1) : '0.0'
    },
    {
      sentiment: 'Negative',
      count: negative,
      percentage: total > 0 ? ((negative / total) * 100).toFixed(1) : '0.0'
    }
  ];

  return (
    <BarChart
      data={sentimentData}
      xDataKey="sentiment" // This will now be the YAxis (category)
      yDataKey="count" // This will now be the XAxis (numerical)
      title={title}
      height={250}
      layout="horizontal"
      colors={['#10b981', '#6b7280', '#ef4444']}
      formatXAxis={(value) => formatNumber(value)} // XAxis is now numerical
      formatYAxis={(value) => truncateText(value, 15)} // YAxis is now categorical
    />
  );
};

export const StackedBarChart = ({ data, title, bars, ...props }) => {
  return (
    <BarChart
      data={data}
      bars={bars}
      title={title}
      showLegend={true}
      layout="horizontal"
      {...props}
    />
  );
};

export default BarChart;