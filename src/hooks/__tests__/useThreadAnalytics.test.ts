import { renderHook, act } from '@testing-library/react';
import { useThreadAnalytics } from '../useThreadAnalytics';
import { ThreadAnalyticsService } from '@/services/analytics/ThreadAnalyticsService';
import { ThreadMetrics, ThreadPerformanceMetrics, ThreadReport } from '@/types/analytics';

// Mock the ThreadAnalyticsService
jest.mock('@/services/analytics/ThreadAnalyticsService');

describe('useThreadAnalytics', () => {
    const mockMetrics: ThreadMetrics = {
        threadId: 'test-thread',
        createdAt: new Date('2024-03-21T00:00:00Z'),
        lastActivity: new Date('2024-03-21T23:59:59Z'),
        messageCount: 150,
        participantCount: 10,
        activeParticipants: 5,
        averageResponseTime: 2500,
        depth: 8,
        branchCount: 12,
        engagementScore: 85.5
    };

    const mockPerformance: ThreadPerformanceMetrics = {
        threadId: 'test-thread',
        loadTime: 850,
        messageLatency: 250,
        cacheHitRate: 0.75,
        errorRate: 0.02,
        resourceUsage: {
            cpu: 0.65,
            memory: 0.80,
            network: 0.45
        },
        timestamp: new Date('2024-03-21T23:59:59Z')
    };

    const mockReport: ThreadReport = {
        threadId: 'test-thread',
        period: {
            start: new Date('2024-03-21T00:00:00Z'),
            end: new Date('2024-03-21T23:59:59Z')
        },
        metrics: mockMetrics,
        performance: mockPerformance,
        trends: {
            messageVolume: [10, 20, 15, 25, 30],
            participantActivity: [5, 8, 6, 9, 7],
            responseTimes: [2000, 1800, 2200, 1900, 2100],
            errors: [1, 0, 2, 1, 0]
        },
        insights: []
    };

    const mockAnalyticsService = {
        getInstance: jest.fn(),
        getThreadMetrics: jest.fn(),
        getThreadPerformance: jest.fn(),
        generateThreadReport: jest.fn(),
        startRealtimeTracking: jest.fn(),
        stopRealtimeTracking: jest.fn(),
        exportReport: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (ThreadAnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsService);
        mockAnalyticsService.getThreadMetrics.mockResolvedValue(mockMetrics);
        mockAnalyticsService.getThreadPerformance.mockResolvedValue(mockPerformance);
        mockAnalyticsService.generateThreadReport.mockResolvedValue(mockReport);
    });

    it('fetches initial data on mount', async () => {
        const { result } = renderHook(() => useThreadAnalytics('test-thread', {
            includePerformance: true,
            includeReports: true
        }));

        // Initially loading
        expect(result.current.loading).toBe(true);

        // Wait for data to load
        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(result.current.performance).toEqual(mockPerformance);
        expect(result.current.report).toEqual(mockReport);
    });

    it('handles errors during data fetching', async () => {
        const error = new Error('Failed to fetch data');
        mockAnalyticsService.getThreadMetrics.mockRejectedValue(error);

        const { result } = renderHook(() => useThreadAnalytics('test-thread'));

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.error).toEqual(error);
    });

    it('refreshes data when refresh functions are called', async () => {
        const { result } = renderHook(() => useThreadAnalytics('test-thread', {
            includePerformance: true,
            includeReports: true
        }));

        await act(async () => {
            await Promise.resolve();
        });

        // Reset mock counts
        mockAnalyticsService.getThreadMetrics.mockClear();
        mockAnalyticsService.getThreadPerformance.mockClear();
        mockAnalyticsService.generateThreadReport.mockClear();

        // Call refresh functions
        await act(async () => {
            await result.current.refreshMetrics();
            await result.current.refreshPerformance();
            await result.current.refreshReport();
        });

        expect(mockAnalyticsService.getThreadMetrics).toHaveBeenCalledTimes(1);
        expect(mockAnalyticsService.getThreadPerformance).toHaveBeenCalledTimes(1);
        expect(mockAnalyticsService.generateThreadReport).toHaveBeenCalledTimes(1);
    });

    it('starts and stops realtime tracking when enabled', async () => {
        const { result, unmount } = renderHook(() => useThreadAnalytics('test-thread', {
            includePerformance: true,
            realtimePerformance: true
        }));

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockAnalyticsService.startRealtimeTracking).toHaveBeenCalledWith('test-thread');

        unmount();

        expect(mockAnalyticsService.stopRealtimeTracking).toHaveBeenCalledWith('test-thread');
    });

    it('handles export functionality', async () => {
        const exportData = 'exported data';
        mockAnalyticsService.exportReport.mockResolvedValue(exportData);

        const { result } = renderHook(() => useThreadAnalytics('test-thread'));

        await act(async () => {
            await Promise.resolve();
        });

        let exportResult;
        await act(async () => {
            exportResult = await result.current.exportReport('json');
        });

        expect(exportResult).toBe(exportData);
        expect(result.current.exportStatus.exporting).toBe(false);
        expect(result.current.exportStatus.error).toBe(null);
    });

    it('handles export errors', async () => {
        const error = new Error('Export failed');
        mockAnalyticsService.exportReport.mockRejectedValue(error);

        const { result } = renderHook(() => useThreadAnalytics('test-thread'));

        await act(async () => {
            await Promise.resolve();
        });

        await act(async () => {
            try {
                await result.current.exportReport('json');
            } catch (e) {
                // Expected error
            }
        });

        expect(result.current.exportStatus.exporting).toBe(false);
        expect(result.current.exportStatus.error).toEqual(error);
    });

    it('updates data on performance events', async () => {
        const { result } = renderHook(() => useThreadAnalytics('test-thread', {
            includePerformance: true
        }));

        await act(async () => {
            await Promise.resolve();
        });

        const newPerformance = {
            ...mockPerformance,
            loadTime: 1000
        };

        // Simulate performance update event
        act(() => {
            const performanceHandler = mockAnalyticsService.on.mock.calls.find(
                call => call[0] === 'thread:performance:update'
            )[1];
            performanceHandler({ threadId: 'test-thread', metrics: newPerformance });
        });

        expect(result.current.performance).toEqual(newPerformance);
    });

    it('cleans up event listeners on unmount', () => {
        const { unmount } = renderHook(() => useThreadAnalytics('test-thread', {
            includePerformance: true
        }));

        unmount();

        expect(mockAnalyticsService.off).toHaveBeenCalledWith(
            'thread:performance:update',
            expect.any(Function)
        );
        expect(mockAnalyticsService.off).toHaveBeenCalledWith(
            'thread:realtime:error',
            expect.any(Function)
        );
    });
}); 