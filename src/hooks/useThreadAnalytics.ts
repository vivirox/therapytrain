import { useState, useEffect, useCallback } from 'react';
import { ThreadAnalyticsService, ExportFormat } from '@/services/analytics/ThreadAnalyticsService';
import { ThreadMetrics, ThreadPerformanceMetrics, ThreadReport } from '@/types/analytics';

interface UseThreadAnalyticsOptions {
    pollInterval?: number;
    includePerformance?: boolean;
    includeReports?: boolean;
    realtimePerformance?: boolean;
}

interface UseThreadAnalyticsReturn {
    metrics: ThreadMetrics | null;
    performance: ThreadPerformanceMetrics | null;
    report: ThreadReport | null;
    loading: boolean;
    error: Error | null;
    refreshMetrics: () => Promise<void>;
    refreshPerformance: () => Promise<void>;
    refreshReport: () => Promise<void>;
    startRealtimeTracking: () => Promise<void>;
    stopRealtimeTracking: () => Promise<void>;
    exportReport: (format: ExportFormat, period?: { start: Date; end: Date }) => Promise<string | Uint8Array>;
    exportStatus: {
        exporting: boolean;
        error: Error | null;
    };
}

export function useThreadAnalytics(
    threadId: string,
    options: UseThreadAnalyticsOptions = {}
): UseThreadAnalyticsReturn {
    const {
        pollInterval = 60000, // 1 minute
        includePerformance = false,
        includeReports = false,
        realtimePerformance = false
    } = options;

    const [metrics, setMetrics] = useState<ThreadMetrics | null>(null);
    const [performance, setPerformance] = useState<ThreadPerformanceMetrics | null>(null);
    const [report, setReport] = useState<ThreadReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const [exportStatus, setExportStatus] = useState<{
        exporting: boolean;
        error: Error | null;
    }>({
        exporting: false,
        error: null
    });

    const analyticsService = ThreadAnalyticsService.getInstance();

    const refreshMetrics = useCallback(async () => {
        try {
            const threadMetrics = await analyticsService.getThreadMetrics(threadId);
            setMetrics(threadMetrics);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch thread metrics'));
        }
    }, [threadId]);

    const refreshPerformance = useCallback(async () => {
        if (!includePerformance) return;
        
        try {
            const threadPerformance = await analyticsService.getThreadPerformance(threadId);
            setPerformance(threadPerformance);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch thread performance'));
        }
    }, [threadId, includePerformance]);

    const refreshReport = useCallback(async () => {
        if (!includeReports) return;
        
        try {
            const now = new Date();
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const threadReport = await analyticsService.generateThreadReport(threadId, dayAgo, now);
            setReport(threadReport);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to generate thread report'));
        }
    }, [threadId, includeReports]);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([
                refreshMetrics(),
                includePerformance && refreshPerformance(),
                includeReports && refreshReport()
            ].filter(Boolean));
        } finally {
            setLoading(false);
        }
    }, [refreshMetrics, refreshPerformance, refreshReport, includePerformance, includeReports]);

    useEffect(() => {
        refreshAll();

        // Set up polling if interval is provided
        if (pollInterval > 0) {
            const intervalId = setInterval(refreshAll, pollInterval);
            return () => clearInterval(intervalId);
        }
    }, [refreshAll, pollInterval]);

    const startRealtimeTracking = useCallback(async () => {
        if (!includePerformance) return;
        
        try {
            await analyticsService.startRealtimeTracking(threadId);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to start realtime tracking'));
        }
    }, [threadId, includePerformance]);

    const stopRealtimeTracking = useCallback(async () => {
        if (!includePerformance) return;
        
        try {
            await analyticsService.stopRealtimeTracking(threadId);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to stop realtime tracking'));
        }
    }, [threadId, includePerformance]);

    // Start realtime tracking if enabled
    useEffect(() => {
        if (realtimePerformance && includePerformance) {
            startRealtimeTracking();
            return () => {
                stopRealtimeTracking();
            };
        }
    }, [realtimePerformance, includePerformance, startRealtimeTracking, stopRealtimeTracking]);

    // Listen for real-time updates
    useEffect(() => {
        const handlePerformanceUpdate = (data: { threadId: string; metrics: ThreadPerformanceMetrics }) => {
            if (data.threadId === threadId) {
                setPerformance(data.metrics);
            }
        };

        const handleError = (data: { threadId: string; error: Error }) => {
            if (data.threadId === threadId) {
                setError(data.error);
            }
        };

        analyticsService.on('thread:performance:update', handlePerformanceUpdate);
        analyticsService.on('thread:realtime:error', handleError);

        return () => {
            analyticsService.off('thread:performance:update', handlePerformanceUpdate);
            analyticsService.off('thread:realtime:error', handleError);
        };
    }, [threadId]);

    const exportReport = useCallback(async (format: ExportFormat, period?: { start: Date; end: Date }): Promise<string | Uint8Array> => {
        setExportStatus({ exporting: true, error: null });
        try {
            const result = await analyticsService.exportReport(threadId, format, period);
            setExportStatus({ exporting: false, error: null });
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to export report');
            setExportStatus({ exporting: false, error });
            throw error;
        }
    }, [threadId]);

    return {
        metrics,
        performance,
        report,
        loading,
        error,
        refreshMetrics,
        refreshPerformance,
        refreshReport,
        startRealtimeTracking,
        stopRealtimeTracking,
        exportReport,
        exportStatus
    };
} 