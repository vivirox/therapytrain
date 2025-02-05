import React, { useState, useEffect } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { format, subDays } from 'date-fns';

interface SecurityMetrics {
    time_bucket: string;
    total_events: number;
    failure_events: number;
    auth_successes: number;
    auth_failures: number;
    security_alerts: number;
    rate_limit_events: number;
    session_events: number;
    data_access_events: number;
}

interface SecurityAlert {
    id: string;
    details: {
        type: string;
        severity: string;
        reason: string;
        ip?: string;
    };
    createdAt: string;
}

export const AuditDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<SecurityMetrics[]>([]);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('24h');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const endTime = new Date();
                const startTime = subDays(endTime, timeRange === '24h' ? 1 : 7);

                // Fetch metrics
                const metricsResponse = await fetch(`/api/audit/metrics?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}&interval=hour`);
                if (!metricsResponse.ok) throw new Error('Failed to fetch metrics');
                const metricsData = await metricsResponse.json();
                setMetrics(metricsData);

                // Fetch alerts
                const alertsResponse = await fetch('/api/audit/alerts');
                if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
                const alertsData = await alertsResponse.json();
                setAlerts(alertsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [timeRange]);

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Time Range Selector */}
            <div className="flex justify-end space-x-2">
                <button
                    onClick={() => setTimeRange('24h')}
                    className={`px-4 py-2 rounded ${timeRange === '24h'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                        }`}
                >
                    24 Hours
                </button>
                <button
                    onClick={() => setTimeRange('7d')}
                    className={`px-4 py-2 rounded ${timeRange === '7d'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                        }`}
                >
                    7 Days
                </button>
            </div>

            {/* Event Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Event Timeline</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time_bucket"
                                tickFormatter={(time) => format(new Date(time), 'HH:mm')}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(time) => format(new Date(time), 'yyyy-MM-dd HH:mm')}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="total_events"
                                stroke="#2563eb"
                                name="Total Events"
                            />
                            <Line
                                type="monotone"
                                dataKey="failure_events"
                                stroke="#dc2626"
                                name="Failures"
                            />
                            <Line
                                type="monotone"
                                dataKey="security_alerts"
                                stroke="#eab308"
                                name="Security Alerts"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Event Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Event Distribution</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.slice(-1)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time_bucket" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="auth_successes"
                                fill="#22c55e"
                                name="Auth Successes"
                            />
                            <Bar
                                dataKey="auth_failures"
                                fill="#dc2626"
                                name="Auth Failures"
                            />
                            <Bar
                                dataKey="rate_limit_events"
                                fill="#eab308"
                                name="Rate Limits"
                            />
                            <Bar
                                dataKey="session_events"
                                fill="#2563eb"
                                name="Session Events"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Security Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Security Alerts</h2>
                <div className="space-y-4">
                    {alerts.slice(0, 5).map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-4 rounded-lg ${alert.details.severity === 'HIGH'
                                ? 'bg-red-50 border border-red-200'
                                : alert.details.severity === 'MEDIUM'
                                    ? 'bg-yellow-50 border border-yellow-200'
                                    : 'bg-blue-50 border border-blue-200'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold">{alert.details.type}</h3>
                                    <p className="text-sm mt-1">{alert.details.reason}</p>
                                    {alert.details.ip && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            IP: {alert.details.ip}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={`text-sm px-2 py-1 rounded ${alert.details.severity === 'HIGH'
                                        ? 'bg-red-100 text-red-800'
                                        : alert.details.severity === 'MEDIUM'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                >
                                    {alert.details.severity}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                                {format(new Date(alert.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}; 