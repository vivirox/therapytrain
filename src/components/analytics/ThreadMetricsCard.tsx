import React from 'react';
import { ThreadMetrics } from '@/types/analytics';
import { Card, CardContent, CardHeader, Typography, Grid, Tooltip } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface ThreadMetricsCardProps {
    metrics: ThreadMetrics;
    className?: string;
}

export const ThreadMetricsCard: React.FC<ThreadMetricsCardProps> = ({ metrics, className }) => {
    const formatValue = (value: number, type: 'number' | 'time' | 'percentage'): string => {
        switch (type) {
            case 'time':
                return `${value.toFixed(2)}ms`;
            case 'percentage':
                return `${value.toFixed(1)}%`;
            default:
                return value.toLocaleString();
        }
    };

    const metricsData = [
        {
            label: 'Messages',
            value: metrics.messageCount,
            type: 'number' as const,
            tooltip: 'Total number of messages in the thread'
        },
        {
            label: 'Participants',
            value: metrics.participantCount,
            type: 'number' as const,
            tooltip: 'Total number of participants in the thread'
        },
        {
            label: 'Active Users',
            value: metrics.activeParticipants,
            type: 'number' as const,
            tooltip: 'Number of participants active in the last 15 minutes'
        },
        {
            label: 'Response Time',
            value: metrics.averageResponseTime,
            type: 'time' as const,
            tooltip: 'Average time between messages'
        },
        {
            label: 'Thread Depth',
            value: metrics.depth,
            type: 'number' as const,
            tooltip: 'Maximum depth of message replies'
        },
        {
            label: 'Branches',
            value: metrics.branchCount,
            type: 'number' as const,
            tooltip: 'Number of conversation branches'
        },
        {
            label: 'Engagement',
            value: metrics.engagementScore,
            type: 'percentage' as const,
            tooltip: 'Overall engagement score based on activity and participation'
        }
    ];

    return (
        <Card className={className}>
            <CardHeader
                title="Thread Metrics"
                subheader={`Last updated ${formatDistanceToNow(metrics.lastActivity, { addSuffix: true })}`}
            />
            <CardContent>
                <Grid container spacing={2}>
                    {metricsData.map(({ label, value, type, tooltip }) => (
                        <Grid item xs={6} sm={4} key={label}>
                            <Tooltip title={tooltip} arrow placement="top">
                                <div>
                                    <Typography variant="caption" color="textSecondary">
                                        {label}
                                    </Typography>
                                    <Typography variant="h6">
                                        {formatValue(value, type)}
                                    </Typography>
                                </div>
                            </Tooltip>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
}; 