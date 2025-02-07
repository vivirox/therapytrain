import React from 'react';
import { MetricsDashboard } from '../components/MetricsDashboard';

const Analytics: React.FC =    () => {
  return (
    <div className="min-h-screen bg-gradient-radial from-[#0A0A0B] via-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-conic from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <div className="bg-gradient-radial from-gray-800/30 to-transparent p-6 rounded-xl">
          <MetricsDashboard ></MetricsDashboard>
        </div>
      </div>
    </div>
  );
};

export default Analytics;