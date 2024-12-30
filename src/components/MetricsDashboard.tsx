import { UsageMetricsChart } from './UsageMetricsChart';
import { THERAPY_METRICS } from '../types/analytics';

export const MetricsDashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="col-span-full mb-6">
        <h2 className="text-2xl font-bold bg-gradient-conic from-blue-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          Performance Metrics
        </h2>
      </div>
      {Object.values(THERAPY_METRICS).flat().map((metric) => (
        <div key={metric.id} className="bg-gradient-radial from-gray-800/50 to-gray-900/90 p-1 rounded-xl hover:from-gray-700/50 hover:to-gray-800/90 transition-all">
          <div className="bg-gradient-conic from-gray-900/50 to-gray-800/50 rounded-lg p-4">
            <UsageMetricsChart
              metricId={metric.id}
              usageData={metric.usageData || []}
            />
          </div>
        </div>
      ))}
    </div>
  );
}