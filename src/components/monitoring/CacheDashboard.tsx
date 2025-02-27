"use client";

import { useEffect, useState } from 'react';
import { getCacheAnalytics } from '@/lib/redis';
import { CacheMetrics, CacheAlert } from '@/services/CacheMonitoringService';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CacheAnalytics {
  metrics: CacheMetrics;
  alerts: CacheAlert[];
  history: CacheMetrics[];
  recommendations: string[];
}

export function CacheDashboard() {
  const [analytics, setAnalytics] = useState<CacheAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getCacheAnalytics();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch cache analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading cache analytics...</div>;
  }

  if (error) {
    return <Alert variant="destructive">{error}</Alert>;
  }

  if (!analytics) {
    return null;
  }

  const { metrics, alerts, history, recommendations } = analytics;

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Cache Monitoring Dashboard</h2>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Active Alerts</h3>
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.type === 'errorRate' ? 'destructive' : 'warning'}
            >
              <AlertTitle>
                {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert
              </AlertTitle>
              <AlertDescription>
                Current value: {alert.value.toFixed(2)} (Threshold: {alert.threshold})
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold">Hit Rate</h4>
          <p className="text-2xl">{(metrics.hitRate * 100).toFixed(1)}%</p>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold">Average Latency</h4>
          <p className="text-2xl">{metrics.avgLatency.toFixed(2)}ms</p>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold">Memory Usage</h4>
          <p className="text-2xl">{(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</p>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold">Total Keys</h4>
          <p className="text-2xl">{metrics.keyCount}</p>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="space-y-6">
        <Card className="p-4">
          <h3 className="text-xl font-semibold mb-4">Hit Rate History</h3>
          <LineChart width={800} height={300} data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="hitRate" stroke="#8884d8" />
          </LineChart>
        </Card>

        <Card className="p-4">
          <h3 className="text-xl font-semibold mb-4">Latency History</h3>
          <LineChart width={800} height={300} data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avgLatency" stroke="#82ca9d" />
          </LineChart>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
          <ul className="list-disc pl-6 space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
} 