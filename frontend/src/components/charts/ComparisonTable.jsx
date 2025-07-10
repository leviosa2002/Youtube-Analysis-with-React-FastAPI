import React from 'react';
import { formatNumber } from '../../services/utils'; // Assuming formatNumber is in utils.js

const ComparisonTable = ({ data, metrics, title = '', subtitle = '', className = '' }) => {
  if (!data || data.length === 0 || !metrics || metrics.length === 0) {
    return (
      <div className={`card ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <p className="text-sm">No comparison data available</p>
            <p className="text-xs mt-1">Table will appear when data is loaded</p>
          </div>
        </div>
      </div>
    );
  }

  // Ensure data has consistent keys for rendering
  const processedData = data.map(item => ({
    ...item,
    name: item.title || item.keyword || item.category || 'N/A' // Fallback for name display in the first column
  }));

  // Determine headers dynamically from metrics prop
  const headers = ['Name', ...metrics.map(m => m.header)];

  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.name}
                </td>
                {metrics.map((metric, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Use the formatter if provided, otherwise default to formatNumber */}
                    {metric.formatter ? metric.formatter(row[metric.key]) : formatNumber(row[metric.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonTable;