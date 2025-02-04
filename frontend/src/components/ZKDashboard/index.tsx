import React, { useEffect, useState } from 'react';
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
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    CircularProgress,
    Alert,
    Snackbar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ZKMetrics {
    timestamp: number;
    metrics: {
        averageProofTime: number;
        averageVerificationTime: number;
        cacheHitRate: number;
        errorRate: number;
        workerUtilization: number[];
        totalEvents: number;
        errorEvents: number;
    };
}

const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

export const ZKDashboard: React.FC = () => {
    const theme = useTheme();
    const [metrics, setMetrics] = useState<ZKMetrics[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const connectWebSocket = () => {
            const socket = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws');

            socket.onopen = () => {
                setConnected(true);
                setError(null);
            };

            socket.onmessage = (event) => {
                const newMetrics = JSON.parse(event.data);
                setMetrics(prev => [...prev.slice(-50), newMetrics]); // Keep last 50 data points
            };

            socket.onerror = (event) => {
                setError('WebSocket connection error');
                setConnected(false);
            };

            socket.onclose = () => {
                setConnected(false);
                // Attempt to reconnect after 5 seconds
                setTimeout(connectWebSocket, 5000);
            };

            setWs(socket);
        };

        connectWebSocket();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    const latestMetrics = metrics[metrics.length - 1]?.metrics;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Zero Knowledge System Monitor
            </Typography>

            {!connected && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Connecting to metrics server...
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Performance Metrics */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Performance
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={metrics}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                                        formatter={(value: number) => formatDuration(value)}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="metrics.averageProofTime"
                                        name="Proof Generation"
                                        stroke={theme.palette.primary.main}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="metrics.averageVerificationTime"
                                        name="Verification"
                                        stroke={theme.palette.secondary.main}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Cache and Error Rates */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                System Health
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={metrics}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                                    />
                                    <YAxis tickFormatter={formatPercentage} />
                                    <Tooltip
                                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                                        formatter={(value: number) => formatPercentage(value)}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="metrics.cacheHitRate"
                                        name="Cache Hit Rate"
                                        stroke={theme.palette.success.main}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="metrics.errorRate"
                                        name="Error Rate"
                                        stroke={theme.palette.error.main}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Worker Utilization */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Worker Utilization
                            </Typography>
                            {latestMetrics ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart
                                        data={latestMetrics.workerUtilization.map((value, index) => ({
                                            worker: `Worker ${index + 1}`,
                                            tasks: value
                                        }))}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="worker" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar
                                            dataKey="tasks"
                                            fill={theme.palette.primary.main}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <CircularProgress />
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Summary Statistics */}
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Total Events
                                    </Typography>
                                    <Typography variant="h4">
                                        {latestMetrics?.totalEvents.toLocaleString() ?? '-'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Error Events
                                    </Typography>
                                    <Typography variant="h4" color="error">
                                        {latestMetrics?.errorEvents.toLocaleString() ?? '-'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Cache Hit Rate
                                    </Typography>
                                    <Typography variant="h4" color="success">
                                        {latestMetrics
                                            ? formatPercentage(latestMetrics.cacheHitRate)
                                            : '-'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Avg Proof Time
                                    </Typography>
                                    <Typography variant="h4">
                                        {latestMetrics
                                            ? formatDuration(latestMetrics.averageProofTime)
                                            : '-'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};
