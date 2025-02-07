import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
interface Metric {
    id: string;
    name: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
}
interface ChartData {
    date: string;
    sessions: number;
    engagement: number;
    satisfaction: number;
}
const MetricsDashboard: React.FC =    () => {
    const { data: metrics, isLoading: metricsLoading } = useQuery<Metric[]>({
        queryKey: ['metrics'],
        queryFn: async () => {
            // TODO: Replace with actual API call
            return [
                {
                    id: '1',
                    name: 'Active Sessions',
                    value: 245,
                    change: 12,
                    trend: 'up'
                },
                {
                    id: '2',
                    name: 'Client Engagement',
                    value: 87,
                    change: 5,
                    trend: 'up'
                },
                {
                    id: '3',
                    name: 'Average Session Duration',
                    value: 45,
                    change: -2,
                    trend: 'down'
                },
                {
                    id: '4',
                    name: 'Client Satisfaction',
                    value: 92,
                    change: 3,
                    trend: 'up'
                }
            ];
        }
    });
    const { data: chartData, isLoading: chartLoading } = useQuery<ChartData[]>({
        queryKey: ['chartData'],
        queryFn: async () => {
            // TODO: Replace with actual API call
            return [
                { date: '2024-01', sessions: 165, engagement: 78, satisfaction: 85 },
                { date: '2024-02', sessions: 184, engagement: 82, satisfaction: 87 },
                { date: '2024-03', sessions: 205, engagement: 85, satisfaction: 89 },
                { date: '2024-04', sessions: 245, engagement: 87, satisfaction: 92 }
            ];
        }
    });
    if (metricsLoading || chartLoading) {
        return (<div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i: any) => (<Card key={i} className="p-4">
              <Skeleton className="h-4 w-[100px] mb-2"></Skeleton>
              <Skeleton className="h-8 w-[60px] mb-2"></Skeleton>
              <Skeleton className="h-4 w-[80px]"></Skeleton>
            </Card>))}
        </div>
        <Card className="p-4">
          <Skeleton className="h-[300px] w-full"></Skeleton>
        </Card>
      </div>);
    }
    return (<div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics?.map((metric: unknown) => (<Card key={metric.id} className="p-4">
            <h3 className="text-sm font-medium text-gray-400">{metric.name}</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold">{metric.value}</p>
              <p className={`ml-2 text-sm ${metric.trend === 'up' ? 'text-green-500' :
                metric.trend === 'down' ? 'text-red-500' :
                    'text-gray-500'}`}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </p>
            </div>
          </Card>))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Performance Trends</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3"></CartesianGrid>
              <XAxis dataKey="date"></XAxis>
              <YAxis ></YAxis>
              <Tooltip ></Tooltip>
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" name="Sessions"></Line>
              <Line type="monotone" dataKey="engagement" stroke="#10b981" name="Engagement"></Line>
              <Line type="monotone" dataKey="satisfaction" stroke="#8b5cf6" name="Satisfaction"></Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>);
};
export { MetricsDashboard };
