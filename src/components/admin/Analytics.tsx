import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseclient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  MdTrendingUp,
  MdPeople,
  MdChat,
  MdAccessTime,
  MdSecurity,
} from 'react-icons/md';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
}

interface SystemMetrics {
  total_users: number;
  active_users: number;
  total_sessions: number;
  avg_session_duration: number;
  security_events: number;
}

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState<SystemMetrics>({
    total_users: 0,
    active_users: 0,
    total_sessions: 0,
    avg_session_duration: 0,
    security_events: 0,
  });
  const [userActivityData, setUserActivityData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchUserActivity();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Fetch active users (users with sessions in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: activeUsers } = await supabase
        .from('sessions')
        .select('user_id', { count: 'exact', distinct: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch total sessions
      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact' });

      // Fetch average session duration
      const { data: sessionDurations } = await supabase
        .from('sessions')
        .select('duration');
      const avgDuration = sessionDurations?.reduce((acc, curr) => acc + curr.duration, 0) || 0;

      // Fetch security events
      const { count: securityEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('severity', 'error');

      setMetrics({
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_sessions: totalSessions || 0,
        avg_session_duration: avgDuration / (sessionDurations?.length || 1),
        security_events: securityEvents || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    }
  };

  const fetchUserActivity = async () => {
    try {
      const timeRangeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const days = timeRangeMap[timeRange as keyof typeof timeRangeMap];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_activity')
        .select('timestamp, count')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setUserActivityData(
        data.map((item) => ({
          timestamp: new Date(item.timestamp).toLocaleDateString(),
          value: item.count,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user activity');
    } finally {
      setLoading(false);
    }
  };

  const metricCards: MetricCard[] = [
    {
      title: 'Total Users',
      value: metrics.total_users,
      change: 12,
      icon: <MdPeople className="w-6 h-6" />,
    },
    {
      title: 'Active Users',
      value: metrics.active_users,
      change: 8,
      icon: <MdTrendingUp className="w-6 h-6" />,
    },
    {
      title: 'Total Sessions',
      value: metrics.total_sessions,
      change: 24,
      icon: <MdChat className="w-6 h-6" />,
    },
    {
      title: 'Avg Session Duration',
      value: `${Math.round(metrics.avg_session_duration / 60)} min`,
      change: -5,
      icon: <MdAccessTime className="w-6 h-6" />,
    },
    {
      title: 'Security Events',
      value: metrics.security_events,
      change: -15,
      icon: <MdSecurity className="w-6 h-6" />,
    },
  ];

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
                {card.change >= 0 ? '+' : ''}{card.change}% from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">User Activity</CardTitle>
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
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
              <LineChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics; 