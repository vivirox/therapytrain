import { ThreadAnalyticsService } from '../ThreadAnalyticsService';
import { supabase } from '@/lib/supabase';
import { MonitoringService } from '../../MonitoringService';
import { SmartCacheService } from '../../SmartCacheService';
import { WebSocketService } from '../../WebSocketService';
import { ThreadReportExporter } from '../ThreadReportExporter';
import { ThreadAnalyticsEvent, ThreadMetrics, ThreadPerformanceMetrics } from '@/types/analytics';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('../../MonitoringService');
jest.mock('../../SmartCacheService');
jest.mock('../../WebSocketService');
jest.mock('../ThreadReportExporter');

describe('ThreadAnalyticsService', () => {
    let service: ThreadAnalyticsService;
    let mockCacheService: jest.Mocked<SmartCacheService>;
    
    const mockEvent: ThreadAnalyticsEvent = {
        type: 'thread_created',
        threadId: 'test-thread',
        userId: 'test-user',
        timestamp: new Date(),
        metadata: {}
    };

    const mockActivitySummary = {
        thread_id: 'test-thread',
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        message_count: 150,
        participant_count: 10,
        active_participants: 5,
        average_response_time: 2500,
        depth: 8,
        branch_count: 12,
        engagement_score: 85.5,
        load_time: 850,
        message_latency: 250,
        cache_hit_rate: 0.75,
        error_rate: 0.02,
        cpu_usage: 0.65,
        memory_usage: 0.80,
        network_usage: 0.45,
        performance_timestamp: new Date().toISOString(),
        recent_events: []
    };

    const mockHourlyTrends = [
        {
            thread_id: 'test-thread',
            hour: new Date().toISOString(),
            avg_message_volume: 25,
            avg_participant_activity: 8,
            avg_response_time: 2000,
            total_errors: 2,
            sample_count: 12
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset singleton instance
        (ThreadAnalyticsService as any).instance = null;
        
        // Mock cache service
        mockCacheService = {
            get: jest.fn(),
            set: jest.fn(),
            getStats: jest.fn(),
            getInstance: jest.fn()
        } as any;
        (SmartCacheService.getInstance as jest.Mock).mockReturnValue(mockCacheService);
        
        // Mock Supabase responses
        (supabase.from as jest.Mock).mockReturnValue({
            insert: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockActivitySummary }),
                    gte: jest.fn().mockReturnValue({
                        lte: jest.fn().mockReturnValue({
                            order: jest.fn().mockResolvedValue({ data: mockHourlyTrends })
                        })
                    })
                })
            })
        });

        service = ThreadAnalyticsService.getInstance();
    });

    describe('trackEvent', () => {
        it('tracks events correctly', async () => {
            await service.trackEvent(mockEvent);

            expect(supabase.from).toHaveBeenCalledWith('thread_events');
            expect(supabase.from('thread_events').insert).toHaveBeenCalledWith([{
                thread_id: mockEvent.threadId,
                user_id: mockEvent.userId,
                event_type: mockEvent.type,
                metadata: mockEvent.metadata,
                created_at: mockEvent.timestamp
            }]);
        });

        it('emits event after tracking', async () => {
            const emitSpy = jest.spyOn(service, 'emit');
            await service.trackEvent(mockEvent);
            
            expect(emitSpy).toHaveBeenCalledWith('thread:event', mockEvent);
        });

        it('handles tracking errors', async () => {
            const error = new Error('Failed to track event');
            (supabase.from('thread_events').insert as jest.Mock)
                .mockResolvedValue({ error });

            await expect(service.trackEvent(mockEvent))
                .rejects.toThrow('Failed to track event');
        });
    });

    describe('getThreadMetrics', () => {
        it('returns cached metrics when available', async () => {
            const cachedMetrics: ThreadMetrics = {
                threadId: 'test-thread',
                createdAt: new Date(),
                lastActivity: new Date(),
                messageCount: 100,
                participantCount: 5,
                activeParticipants: 3,
                averageResponseTime: 2000,
                depth: 5,
                branchCount: 8,
                engagementScore: 75
            };

            mockCacheService.get.mockResolvedValueOnce(cachedMetrics);

            const result = await service.getThreadMetrics('test-thread');

            expect(result).toEqual(cachedMetrics);
            expect(mockCacheService.get).toHaveBeenCalledWith('thread:metrics:test-thread');
            expect(supabase.from).not.toHaveBeenCalled();
        });

        it('fetches metrics from materialized view when cache misses', async () => {
            mockCacheService.get.mockResolvedValueOnce(null);

            const result = await service.getThreadMetrics('test-thread');

            expect(supabase.from).toHaveBeenCalledWith('thread_activity_summary');
            expect(mockCacheService.set).toHaveBeenCalledWith(
                'thread:metrics:test-thread',
                expect.any(Object),
                60
            );
            expect(result).toMatchObject({
                threadId: 'test-thread',
                messageCount: 150,
                participantCount: 10
            });
        });

        it('handles errors when fetching metrics', async () => {
            mockCacheService.get.mockResolvedValueOnce(null);
            (supabase.from('thread_activity_summary').select().eq().single as jest.Mock)
                .mockResolvedValueOnce({ error: new Error('Database error') });

            await expect(service.getThreadMetrics('test-thread'))
                .rejects.toThrow('Failed to fetch metrics');
        });
    });

    describe('getThreadPerformance', () => {
        it('returns cached performance metrics when available', async () => {
            const cachedPerformance: ThreadPerformanceMetrics = {
                threadId: 'test-thread',
                loadTime: 800,
                messageLatency: 200,
                cacheHitRate: 0.8,
                errorRate: 0.01,
                resourceUsage: {
                    cpu: 0.6,
                    memory: 0.7,
                    network: 0.4
                },
                timestamp: new Date()
            };

            mockCacheService.get.mockResolvedValueOnce(cachedPerformance);

            const result = await service.getThreadPerformance('test-thread');

            expect(result).toEqual(cachedPerformance);
            expect(mockCacheService.get).toHaveBeenCalledWith('thread:performance:test-thread');
            expect(supabase.from).not.toHaveBeenCalled();
        });

        it('fetches performance from materialized view when cache misses', async () => {
            mockCacheService.get.mockResolvedValueOnce(null);

            const result = await service.getThreadPerformance('test-thread');

            expect(supabase.from).toHaveBeenCalledWith('thread_activity_summary');
            expect(mockCacheService.set).toHaveBeenCalledWith(
                'thread:performance:test-thread',
                expect.any(Object),
                30
            );
            expect(result).toMatchObject({
                threadId: 'test-thread',
                loadTime: 850,
                messageLatency: 250
            });
        });

        it('handles errors when fetching performance metrics', async () => {
            mockCacheService.get.mockResolvedValueOnce(null);
            (supabase.from('thread_activity_summary').select().eq().single as jest.Mock)
                .mockResolvedValueOnce({ error: new Error('Database error') });

            await expect(service.getThreadPerformance('test-thread'))
                .rejects.toThrow('Failed to fetch performance metrics');
        });
    });

    describe('generateThreadReport', () => {
        const startDate = new Date('2024-03-21T00:00:00Z');
        const endDate = new Date('2024-03-21T23:59:59Z');

        it('returns cached report when available', async () => {
            const cachedReport = {
                threadId: 'test-thread',
                period: { start: startDate, end: endDate },
                metrics: mockActivitySummary,
                performance: mockActivitySummary,
                trends: mockHourlyTrends,
                insights: []
            };

            mockCacheService.get.mockResolvedValueOnce(cachedReport);

            const result = await service.generateThreadReport('test-thread', startDate, endDate);

            expect(result).toEqual(cachedReport);
            expect(mockCacheService.get).toHaveBeenCalledWith(
                `thread:report:test-thread:${startDate.getTime()}:${endDate.getTime()}`
            );
            expect(supabase.from).not.toHaveBeenCalled();
        });

        it('generates report from materialized views when cache misses', async () => {
            mockCacheService.get.mockResolvedValueOnce(null);

            const result = await service.generateThreadReport('test-thread', startDate, endDate);

            expect(supabase.from).toHaveBeenCalledWith('thread_activity_summary');
            expect(supabase.from).toHaveBeenCalledWith('thread_hourly_trends');
            expect(mockCacheService.set).toHaveBeenCalledWith(
                `thread:report:test-thread:${startDate.getTime()}:${endDate.getTime()}`,
                expect.any(Object),
                300
            );
            expect(result).toMatchObject({
                threadId: 'test-thread',
                period: { start: startDate, end: endDate }
            });
        });

        it('handles errors when generating report', async () => {
            mockCacheService.get.mockResolvedValueOnce(null);
            (supabase.from('thread_activity_summary').select().eq().single as jest.Mock)
                .mockResolvedValueOnce({ error: new Error('Database error') });

            await expect(service.generateThreadReport('test-thread', startDate, endDate))
                .rejects.toThrow('Failed to generate thread report');
        });
    });

    describe('realtime tracking', () => {
        it('starts realtime tracking correctly', async () => {
            await service.startRealtimeTracking('test-thread');

            expect(WebSocketService.getInstance().subscribe)
                .toHaveBeenCalledWith(
                    'thread-performance:test-thread',
                    expect.any(Function)
                );
        });

        it('stops realtime tracking correctly', async () => {
            await service.startRealtimeTracking('test-thread');
            await service.stopRealtimeTracking('test-thread');

            expect(WebSocketService.getInstance().unsubscribe)
                .toHaveBeenCalledWith('thread-performance:test-thread');
        });

        it('handles realtime tracking errors', async () => {
            const error = new Error('Failed to start tracking');
            (WebSocketService.getInstance().subscribe as jest.Mock)
                .mockRejectedValue(error);

            await expect(service.startRealtimeTracking('test-thread'))
                .rejects.toThrow('Failed to start tracking');
        });
    });

    describe('export functionality', () => {
        beforeEach(() => {
            (ThreadReportExporter.getInstance().exportToCsv as jest.Mock)
                .mockResolvedValue('csv data');
            (ThreadReportExporter.getInstance().exportToJson as jest.Mock)
                .mockReturnValue('json data');
            (ThreadReportExporter.getInstance().exportToPdf as jest.Mock)
                .mockResolvedValue(new Uint8Array([1, 2, 3]));
        });

        it('exports to CSV correctly', async () => {
            const result = await service.exportReport('test-thread', 'csv');
            expect(result).toBe('csv data');
        });

        it('exports to JSON correctly', async () => {
            const result = await service.exportReport('test-thread', 'json');
            expect(result).toBe('json data');
        });

        it('exports to PDF correctly', async () => {
            const result = await service.exportReport('test-thread', 'pdf');
            expect(result).toEqual(new Uint8Array([1, 2, 3]));
        });

        it('handles export errors', async () => {
            const error = new Error('Export failed');
            (ThreadReportExporter.getInstance().exportToCsv as jest.Mock)
                .mockRejectedValue(error);

            await expect(service.exportReport('test-thread', 'csv'))
                .rejects.toThrow('Export failed');
        });
    });

    describe('cleanup', () => {
        it('cleans up resources correctly', async () => {
            await service.startRealtimeTracking('test-thread');
            service.cleanup();

            expect(WebSocketService.getInstance().unsubscribe)
                .toHaveBeenCalledWith('thread-performance:test-thread');
        });
    });
}); 