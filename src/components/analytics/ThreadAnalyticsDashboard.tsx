import React from 'react';
import { Grid, Paper, Button, Box, CircularProgress } from '@mui/material';
import { useThreadAnalytics } from '@/hooks/useThreadAnalytics';
import { ThreadMetricsCard } from './ThreadMetricsCard';
import { ThreadPerformanceCard } from './ThreadPerformanceCard';
import { ThreadTrendsChart } from './ThreadTrendsChart';
import { ThreadInsightsCard } from './ThreadInsightsCard';
import { ComparativeAnalyticsCard } from './ComparativeAnalyticsCard';
import { ExportFormat } from '@/services/analytics/ThreadAnalyticsService';
import { FileDownload as DownloadIcon } from '@mui/icons-material';

interface ThreadAnalyticsDashboardProps {
    threadId: string;
    className?: string;
}

export const ThreadAnalyticsDashboard: React.FC<ThreadAnalyticsDashboardProps> = ({
    threadId,
    className
}) => {
    const {
        metrics,
        performance,
        report,
        loading,
        error,
        exportReport,
        exportStatus,
        refreshMetrics,
        refreshPerformance,
        refreshReport
    } = useThreadAnalytics(threadId, {
        includePerformance: true,
        includeReports: true,
        realtimePerformance: true,
        pollInterval: 60000 // 1 minute
    });

    const handleExport = async (format: ExportFormat) => {
        try {
            const data = await exportReport(format);
            
            // Create and trigger download
            const blob = new Blob(
                [data instanceof Uint8Array ? data : data],
                { type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf' }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `thread-analytics-${threadId}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting report:', err);
        }
    };

    // Define metrics for comparative analysis
    const comparativeMetrics = [
        'therapeutic.effectiveness',
        'engagement.score',
        'emotional.regulation',
        'outcome.progress',
        'compliance.adherence'
    ];

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={400}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={400}
            >
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Box color="error.main" mb={2}>
                        Error loading analytics: {error.message}
                    </Box>
                    <Button
                        variant="contained"
                        onClick={() => {
                            refreshMetrics();
                            refreshPerformance();
                            refreshReport();
                        }}
                    >
                        Retry
                    </Button>
                </Paper>
            </Box>
        );
    }

    if (!metrics || !performance || !report) {
        return null;
    }

    return (
        <Box className={className}>
            <Box display="flex" justifyContent="flex-end" mb={2}>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('pdf')}
                    disabled={exportStatus.exporting}
                    sx={{ mr: 1 }}
                >
                    Export PDF
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('csv')}
                    disabled={exportStatus.exporting}
                    sx={{ mr: 1 }}
                >
                    Export CSV
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExport('json')}
                    disabled={exportStatus.exporting}
                >
                    Export JSON
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <ThreadMetricsCard metrics={metrics} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ThreadPerformanceCard performance={performance} />
                </Grid>
                <Grid item xs={12}>
                    <ThreadTrendsChart report={report} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ThreadInsightsCard report={report} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ComparativeAnalyticsCard
                        sessionId={threadId}
                        metrics={comparativeMetrics}
                        therapyType={report.metrics.therapyType}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}; 