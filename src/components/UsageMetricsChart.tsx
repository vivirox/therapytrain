import { Usage } from '../types/usage';
import { THERAPY_METRICS } from '../types/analytics';

interface UsageMetricsChartProps {
  metricId: string;
  usageData: Array<Usage>;
}

export const UsageMetricsChart = ({ metricId, usageData }: UsageMetricsChartProps) => {
  const metric = Object.values(THERAPY_METRICS)
    .flat()
    .find(m => m.id === metricId);

  return (
    <div className="relative overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 bg-gradient-conic from-blue-300 to-purple-400 bg-clip-text text-transparent">
        {metric?.label}
      </h3>
      <div className="h-64 flex items-end space-x-2 relative z-10">
        {usageData.map((data) => (
          <div 
            key={data.day}
            className="flex-1 group relative"
          >
            <div 
              className="absolute inset-0 bg-gradient-radial from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ height: `${(data.amount / Math.max(...usageData.map(d => d.amount))) * 100}%` }}
            />
            <div 
              className="absolute inset-0 bg-gradient-conic from-blue-600 to-purple-600"
              style={{ height: `${(data.amount / Math.max(...usageData.map(d => d.amount))) * 100}%` }}
            />
            <div className="text-xs text-center mt-2 relative z-20">{data.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
};