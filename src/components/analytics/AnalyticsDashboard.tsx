import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MdTrendingUp,
  MdPeople,
  MdChat,
  MdAccessTime,
  MdSecurity,
  MdDownload,
  MdInsights,
} from 'react-icons/md';
import { AnalyticsService } from '@/services/analytics';
import type { AnalyticsReport, MetricGroup, AnalyticsData } from '@/types/api';

interface FilterOptions {
  timeRange: string;
  metricType: string;
  userId?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

export const AnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: '7d',
    metricType: 'all',
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const analyticsService = new AnalyticsService();
      const data = await analyticsService.generateReport({
        startDate: dateRange.start,
        endDate: dateRange.end,
        userId: filters.userId,
        eventTypes: filters.metricType === 'all' ? undefined : [filters.metricType],
      });
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const metricCards = analyticsData ? [
    {
      title: 'Total Sessions',
      value: analyticsData.metrics.totalSessions,
      change: 0, // Calculate change percentage
      icon: <MdChat className="w-6 h-6" />,
    },
    {
      title: 'Active Clients',
      value: analyticsData.metrics.activeClients,
      change: 0,
      icon: <MdPeople className="w-6 h-6" />,
    },
    {
      title: 'Avg Session Duration',
      value: `${Math.round(analyticsData.metrics.averageSessionDuration)}m`,
      change: 0,
      icon: <MdAccessTime className="w-6 h-6" />,
    },
    {
      title: 'Client Satisfaction',
      value: `${analyticsData.metrics.clientSatisfaction}%`,
      change: 0,
      icon: <MdTrendingUp className="w-6 h-6" />,
    },
    {
      title: 'Progress Rate',
      value: `${analyticsData.metrics.progressRate}%`,
      change: 0,
      icon: <MdInsights className="w-6 h-6" />,
    },
  ] : [];

  const exportData = () => {
    if (!analyticsData) return;

    const metricsData = [
      ['Metric', 'Value'],
      ['Total Sessions', analyticsData.metrics.totalSessions],
      ['Active Clients', analyticsData.metrics.activeClients],
      ['Average Session Duration', analyticsData.metrics.averageSessionDuration],
      ['Client Satisfaction', analyticsData.metrics.clientSatisfaction],
      ['Progress Rate', analyticsData.metrics.progressRate],
    ];

    const trendsData = [
      ['Date', 'Sessions', 'Engagement', 'Satisfaction'],
      ...analyticsData.trends.map(trend => [
        trend.date,
        trend.sessions,
        trend.engagement,
        trend.satisfaction,
      ]),
    ];

    const csvContent = 
      'Metrics\n' +
      metricsData.map(row => row.join(',')).join('\n') +
      '\n\nTrends\n' +
      trendsData.map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex flex-wrap gap-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Select
            value={filters.timeRange}
            onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>
          <Select
            value={filters.metricType}
            onChange={(e) => setFilters({ ...filters, metricType: e.target.value })}
          >
            <option value="all">All Metrics</option>
            <option value="sessions">Sessions</option>
            <option value="engagement">Engagement</option>
            <option value="satisfaction">Satisfaction</option>
          </Select>
          <Button
            onClick={exportData}
            className="flex items-center gap-2"
          >
            <MdDownload className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metricCards.map((card, index) => (
          <Card key={index} className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className={`text-xs ${card.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {card.change >= 0 ? '+' : ''}{card.change.toFixed(1)}% from previous
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {analyticsData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke={COLORS[0]}
                      name="Sessions"
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke={COLORS[1]}
                      name="Engagement"
                    />
                    <Line
                      type="monotone"
                      dataKey="satisfaction"
                      stroke={COLORS[2]}
                      name="Satisfaction"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sessions" fill={COLORS[0]} name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.insights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        insight.type === 'success'
                          ? 'bg-green-500/10 text-green-500'
                          : insight.type === 'warning'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      <p className="text-sm">{insight.message}</p>
                      {insight.metric && insight.change && (
                        <p className="text-xs mt-1">
                          {insight.metric}:{' '}
                          <span className={insight.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {insight.change >= 0 ? '+' : ''}{insight.change}%
                          </span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}; 