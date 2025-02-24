import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  MdOutlineEmail,
  MdErrorOutline,
  MdCheckCircleOutline,
  MdTrendingUp,
  MdAccessTime,
  MdDownload,
} from 'react-icons/md';
import { supabase } from '@/lib/supabaseClient';

interface EmailMetrics {
  total_sent: number;
  delivered: number;
  bounced: number;
  spam: number;
  opened: number;
  clicked: number;
  avg_delivery_time: number;
}

interface TimeSeriesData {
  timestamp: string;
  delivered: number;
  bounced: number;
  spam: number;
  opened: number;
  clicked: number;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

interface FilterOptions {
  timeRange: string;
  eventType: EmailEventType | 'all';
  recipient: string;
}

export const EmailAnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: '7d',
    eventType: 'all',
    recipient: '',
  });
  const [metrics, setMetrics] = useState<EmailMetrics>({
    total_sent: 0,
    delivered: 0,
    bounced: 0,
    spam: 0,
    opened: 0,
    clicked: 0,
    avg_delivery_time: 0,
  });
  const [deliveryData, setDeliveryData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchDeliveryData();
  }, [filters]);

  const fetchMetrics = async () => {
    try {
      let query = supabase
        .from('email_events')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.recipient) {
        query = query.ilike('recipient', `%${filters.recipient}%`);
      }

      // Fetch total emails based on filters
      const { count: totalSent } = await query
        .eq('type', 'sent');

      // Fetch delivered emails with filters
      const { count: delivered } = await query
        .eq('type', 'delivered');

      // Fetch bounced emails
      const { count: bounced } = await query
        .eq('type', 'bounced');

      // Fetch spam reports
      const { count: spam } = await query
        .eq('type', 'spam');

      // Fetch opened emails
      const { count: opened } = await query
        .eq('type', 'opened');

      // Fetch clicked emails
      const { count: clicked } = await query
        .eq('type', 'clicked');

      // Calculate average delivery time
      const { data: deliveryTimes } = await query
        .select('created_at, delivered_at');

      const avgTime = deliveryTimes?.reduce((acc, curr) => {
        const deliveryTime = new Date(curr.delivered_at).getTime() - new Date(curr.created_at).getTime();
        return acc + deliveryTime;
      }, 0) || 0;

      setMetrics({
        total_sent: totalSent || 0,
        delivered: delivered || 0,
        bounced: bounced || 0,
        spam: spam || 0,
        opened: opened || 0,
        clicked: clicked || 0,
        avg_delivery_time: avgTime / (deliveryTimes?.length || 1) / 1000, // Convert to seconds
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    }
  };

  const fetchDeliveryData = async () => {
    try {
      const timeRangeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const days = timeRangeMap[filters.timeRange as keyof typeof timeRangeMap];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('email_events')
        .select('type, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Apply filters
      if (filters.recipient) {
        query = query.ilike('recipient', `%${filters.recipient}%`);
      }
      if (filters.eventType !== 'all') {
        query = query.eq('type', filters.eventType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data into time series format
      const timeSeriesData: Record<string, TimeSeriesData> = {};
      
      data.forEach((event) => {
        const date = new Date(event.created_at).toLocaleDateString();
        if (!timeSeriesData[date]) {
          timeSeriesData[date] = {
            timestamp: date,
            delivered: 0,
            bounced: 0,
            spam: 0,
            opened: 0,
            clicked: 0,
          };
        }
        
        timeSeriesData[date][event.type as keyof Omit<TimeSeriesData, 'timestamp'>]++;
      });

      setDeliveryData(Object.values(timeSeriesData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery data');
    } finally {
      setLoading(false);
    }
  };

  const metricCards: MetricCard[] = [
    {
      title: 'Total Sent',
      value: metrics.total_sent,
      change: ((metrics.total_sent - metrics.delivered) / metrics.total_sent) * 100,
      icon: <MdOutlineEmail className="w-6 h-6" />,
    },
    {
      title: 'Delivered',
      value: `${((metrics.delivered / metrics.total_sent) * 100).toFixed(1)}%`,
      change: ((metrics.delivered / metrics.total_sent) * 100) - 100,
      icon: <MdCheckCircleOutline className="w-6 h-6" />,
    },
    {
      title: 'Bounce Rate',
      value: `${((metrics.bounced / metrics.total_sent) * 100).toFixed(1)}%`,
      change: -((metrics.bounced / metrics.total_sent) * 100),
      icon: <MdErrorOutline className="w-6 h-6" />,
    },
    {
      title: 'Open Rate',
      value: `${((metrics.opened / metrics.delivered) * 100).toFixed(1)}%`,
      change: ((metrics.opened / metrics.delivered) * 100) - 100,
      icon: <MdTrendingUp className="w-6 h-6" />,
    },
    {
      title: 'Avg Delivery Time',
      value: `${Math.round(metrics.avg_delivery_time)}s`,
      change: -((metrics.avg_delivery_time - 2) / 2) * 100, // Assuming 2s is the baseline
      icon: <MdAccessTime className="w-6 h-6" />,
    },
  ];

  const convertToCSV = (data: any[], headers: string[]): string => {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"`
          : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMetrics = () => {
    const metricsData = [{
      metric: 'Total Sent',
      value: metrics.total_sent,
      percentage: '100%',
    }, {
      metric: 'Delivered',
      value: metrics.delivered,
      percentage: `${((metrics.delivered / metrics.total_sent) * 100).toFixed(1)}%`,
    }, {
      metric: 'Bounced',
      value: metrics.bounced,
      percentage: `${((metrics.bounced / metrics.total_sent) * 100).toFixed(1)}%`,
    }, {
      metric: 'Spam',
      value: metrics.spam,
      percentage: `${((metrics.spam / metrics.total_sent) * 100).toFixed(1)}%`,
    }, {
      metric: 'Opened',
      value: metrics.opened,
      percentage: `${((metrics.opened / metrics.delivered) * 100).toFixed(1)}%`,
    }, {
      metric: 'Clicked',
      value: metrics.clicked,
      percentage: `${((metrics.clicked / metrics.delivered) * 100).toFixed(1)}%`,
    }, {
      metric: 'Average Delivery Time',
      value: `${Math.round(metrics.avg_delivery_time)}s`,
      percentage: 'N/A',
    }];

    const csvContent = convertToCSV(metricsData, ['metric', 'value', 'percentage']);
    downloadCSV(csvContent, `email-metrics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportTimeSeriesData = () => {
    const csvContent = convertToCSV(deliveryData, ['timestamp', 'delivered', 'bounced', 'spam', 'opened', 'clicked']);
    downloadCSV(csvContent, `email-time-series-${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Select
            value={filters.timeRange}
            onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
            className="w-32"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>

          <Select
            value={filters.eventType}
            onValueChange={(value) => setFilters({ ...filters, eventType: value as EmailEventType | 'all' })}
            className="w-40"
          >
            <option value="all">All Events</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="bounced">Bounced</option>
            <option value="spam">Spam</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
          </Select>

          <Input
            type="text"
            placeholder="Filter by recipient"
            value={filters.recipient}
            onChange={(e) => setFilters({ ...filters, recipient: e.target.value })}
            className="w-64"
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Export Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            onClick={exportMetrics}
            className="flex items-center gap-2"
          >
            <MdDownload className="w-4 h-4" />
            Export Metrics
          </Button>
          <Button
            onClick={exportTimeSeriesData}
            className="flex items-center gap-2"
          >
            <MdDownload className="w-4 h-4" />
            Export Time Series Data
          </Button>
        </CardContent>
      </Card>

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
                {card.change >= 0 ? '+' : ''}{card.change.toFixed(1)}% from baseline
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Delivery Performance</CardTitle>
          <Select
            value={filters.timeRange}
            onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
            className="w-32"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  name="Delivered"
                  stroke="#22c55e"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="bounced"
                  name="Bounced"
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="spam"
                  name="Spam"
                  stroke="#eab308"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl">Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deliveryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="opened"
                  name="Opened"
                  fill="#3b82f6"
                />
                <Bar
                  dataKey="clicked"
                  name="Clicked"
                  fill="#8b5cf6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailAnalyticsDashboard; 