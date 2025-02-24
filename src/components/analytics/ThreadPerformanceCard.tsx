import React from 'react';
import { ThreadPerformanceMetrics } from '@/types/analytics';
import { Card, CardContent, CardHeader, Typography, Grid, LinearProgress, Tooltip } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface ThreadPerformanceCardProps {
    performance: ThreadPerformanceMetrics;
    className?: string;
}

export const ThreadPerformanceCard: React.FC<ThreadPerformanceCardProps> = ({ performance, className }) => {
    const getStatusColor = (value: number, thresholds: { warning: number; error: number }): string => {
        if (value >= thresholds.error) return 'error.main';
        if (value >= thresholds.warning) return 'warning.main';
        return 'success.main';
    };

    const performanceMetrics = [
        {
            label: 'Load Time',
            value: performance.loadTime,
            format: (v: number) => `${v.toFixed(2)}ms`,
            thresholds: { warning: 800, error: 1200 },
            tooltip: 'Time taken to load thread content'
        },
        {
            label: 'Message Latency',
            value: performance.messageLatency,
            format: (v: number) => `${v.toFixed(2)}ms`,
            thresholds: { warning: 300, error: 500 },
            tooltip: 'Average time to deliver messages'
        },
        {
            label: 'Cache Hit Rate',
            value: performance.cacheHitRate * 100,
            format: (v: number) => `${v.toFixed(1)}%`,
            thresholds: { warning: 70, error: 50 },
            tooltip: 'Percentage of successful cache hits'
        },
        {
            label: 'Error Rate',
            value: performance.errorRate * 100,
            format: (v: number) => `${v.toFixed(2)}%`,
            thresholds: { warning: 1, error: 5 },
            tooltip: 'Percentage of failed operations'
        }
    ];

    const resourceMetrics = [
        {
            label: 'CPU Usage',
            value: performance.resourceUsage.cpu * 100,
            format: (v: number) => `${v.toFixed(1)}%`,
            thresholds: { warning: 70, error: 90 },
            tooltip: 'Current CPU utilization'
        },
        {
            label: 'Memory Usage',
            value: performance.resourceUsage.memory * 100,
            format: (v: number) => `${v.toFixed(1)}%`,
            thresholds: { warning: 70, error: 90 },
            tooltip: 'Current memory utilization'
        },
        {
            label: 'Network Usage',
            value: performance.resourceUsage.network * 100,
            format: (v: number) => `${v.toFixed(1)}%`,
            thresholds: { warning: 70, error: 90 },
            tooltip: 'Current network bandwidth utilization'
        }
    ];

    const MetricRow: React.FC<{
        label: string;
        value: number;
        format: (value: number) => string;
        thresholds: { warning: number; error: number };
        tooltip: string;
    }> = ({ label, value, format, thresholds, tooltip }) => (
        <Grid item xs={12}>
            <Tooltip title={tooltip} arrow placement="top">
                <div>
                    <Grid container justifyContent="space-between" alignItems="center" spacing={1}>
                        <Grid item xs={4}>
                            <Typography variant="body2" color="textSecondary">
                                {label}
                            </Typography>
                        </Grid>
                        <Grid item xs={3}>
                            <Typography variant="body2" color={getStatusColor(value, thresholds)}>
                                {format(value)}
                            </Typography>
                        </Grid>
                        <Grid item xs={5}>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(value, 100)}
                                color={
                                    value >= thresholds.error
                                        ? 'error'
                                        : value >= thresholds.warning
                                        ? 'warning'
                                        : 'success'
                                }
                                sx={{ height: 6, borderRadius: 3 }}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Tooltip>
        </Grid>
    );

    return (
        <Card className={className}>
            <CardHeader
                title="Performance Metrics"
                subheader={`Last updated ${formatDistanceToNow(performance.timestamp, { addSuffix: true })}`}
            />
            <CardContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Performance
                        </Typography>
                        <Grid container spacing={1}>
                            {performanceMetrics.map((metric) => (
                                <MetricRow key={metric.label} {...metric} />
                            ))}
                        </Grid>
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Resource Usage
                        </Typography>
                        <Grid container spacing={1}>
                            {resourceMetrics.map((metric) => (
                                <MetricRow key={metric.label} {...metric} />
                            ))}
                        </Grid>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}; 