import React from 'react';
import { ThreadReport } from '@/types/analytics';
import { Card, CardContent, CardHeader, Typography, Grid, Box } from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface ThreadTrendsChartProps {
    report: ThreadReport;
    className?: string;
}

type TrendMetric = 'messageVolume' | 'participantActivity' | 'responseTimes' | 'errors';

export const ThreadTrendsChart: React.FC<ThreadTrendsChartProps> = ({ report, className }) => {
    const [selectedMetrics, setSelectedMetrics] = React.useState<TrendMetric[]>(['messageVolume']);

    const handleMetricsChange = (
        event: React.MouseEvent<HTMLElement>,
        newMetrics: TrendMetric[]
    ) => {
        if (newMetrics.length > 0) {
            setSelectedMetrics(newMetrics);
        }
    };

    const metricConfigs = {
        messageVolume: {
            label: 'Message Volume',
            color: '#2196f3',
            formatter: (value: number) => value.toLocaleString()
        },
        participantActivity: {
            label: 'Active Participants',
            color: '#4caf50',
            formatter: (value: number) => value.toLocaleString()
        },
        responseTimes: {
            label: 'Response Time',
            color: '#ff9800',
            formatter: (value: number) => `${value.toFixed(2)}ms`
        },
        errors: {
            label: 'Errors',
            color: '#f44336',
            formatter: (value: number) => value.toLocaleString()
        }
    };

    // Prepare chart data
    const chartData = report.trends.messageVolume.map((_, index) => {
        const timestamp = new Date(
            report.period.start.getTime() +
            (index * (report.period.end.getTime() - report.period.start.getTime())) /
            (report.trends.messageVolume.length - 1)
        );

        return {
            timestamp,
            messageVolume: report.trends.messageVolume[index],
            participantActivity: report.trends.participantActivity[index],
            responseTimes: report.trends.responseTimes[index],
            errors: report.trends.errors[index]
        };
    });

    // Calculate min and max values for each metric
    const ranges = selectedMetrics.reduce((acc, metric) => {
        const values = chartData.map(d => d[metric]);
        acc[metric] = {
            min: Math.min(...values),
            max: Math.max(...values)
        };
        return acc;
    }, {} as Record<TrendMetric, { min: number; max: number }>);

    return (
        <Card className={className}>
            <CardHeader
                title="Analytics Trends"
                subheader={`${format(report.period.start, 'PPp')} - ${format(report.period.end, 'PPp')}`}
            />
            <CardContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <ToggleButtonGroup
                            value={selectedMetrics}
                            onChange={handleMetricsChange}
                            aria-label="trend metrics"
                            size="small"
                            color="primary"
                        >
                            {Object.entries(metricConfigs).map(([key, { label }]) => (
                                <ToggleButton
                                    key={key}
                                    value={key}
                                    aria-label={label}
                                >
                                    {label}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs={12}>
                        <Box sx={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                                    />
                                    {selectedMetrics.map(metric => (
                                        <YAxis
                                            key={metric}
                                            yAxisId={metric}
                                            orientation={selectedMetrics.indexOf(metric) % 2 ? 'right' : 'left'}
                                            domain={[ranges[metric].min, ranges[metric].max]}
                                            tickFormatter={metricConfigs[metric].formatter}
                                        />
                                    ))}
                                    <Tooltip
                                        labelFormatter={(value) => format(new Date(value), 'PPp')}
                                        formatter={(value: number, name: string) => [
                                            metricConfigs[name as TrendMetric].formatter(value),
                                            metricConfigs[name as TrendMetric].label
                                        ]}
                                    />
                                    <Legend />
                                    {selectedMetrics.map(metric => (
                                        <Line
                                            key={metric}
                                            type="monotone"
                                            dataKey={metric}
                                            name={metricConfigs[metric].label}
                                            stroke={metricConfigs[metric].color}
                                            yAxisId={metric}
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}; 