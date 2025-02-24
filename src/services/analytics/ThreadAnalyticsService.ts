import { AnalyticsService } from './index';
import { EventEmitter } from 'events';
import { supabase } from '@/lib/supabase';
import { ThreadMetrics, ThreadAnalyticsEvent, ThreadPerformanceMetrics, ThreadReport } from '@/types/analytics';
import { MonitoringService } from '../MonitoringService';
import { SmartCacheService } from '../SmartCacheService';
import { WebSocketService } from '../WebSocketService';
import { ThreadReportExporter } from './ThreadReportExporter';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export class ThreadAnalyticsService extends EventEmitter {
    private static instance: ThreadAnalyticsService;
    private readonly analyticsService: AnalyticsService;
    private readonly monitoringService: MonitoringService;
    private readonly cacheService: SmartCacheService;
    private readonly webSocketService: WebSocketService;
    private readonly reportExporter: ThreadReportExporter;
    private readonly METRICS_UPDATE_INTERVAL = 60000; // 1 minute
    private readonly PERFORMANCE_CHECK_INTERVAL = 30000; // 30 seconds
    private readonly REPORT_GENERATION_INTERVAL = 3600000; // 1 hour
    private readonly REALTIME_UPDATE_INTERVAL = 5000; // 5 seconds

    private readonly performanceChannels: Map<string, boolean> = new Map();
    private readonly performanceIntervals: Map<string, NodeJS.Timeout> = new Map();

    private constructor() {
        super();
        this.analyticsService = AnalyticsService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
        this.cacheService = SmartCacheService.getInstance();
        this.webSocketService = WebSocketService.getInstance();
        this.reportExporter = ThreadReportExporter.getInstance();
        this.startMetricsCollection();
        this.setupRealtimeUpdates();
    }

    public static getInstance(): ThreadAnalyticsService {
        if (!ThreadAnalyticsService.instance) {
            ThreadAnalyticsService.instance = new ThreadAnalyticsService();
        }
        return ThreadAnalyticsService.instance;
    }

    public async trackEvent(event: ThreadAnalyticsEvent): Promise<void> {
        try {
            // Track in analytics service
            await this.analyticsService.trackEvent({
                type: `thread_${event.type}`,
                userId: event.userId,
                timestamp: event.timestamp,
                data: {
                    threadId: event.threadId,
                    ...event.metadata
                }
            });

            // Store in Supabase
            const { error } = await supabase
                .from('thread_events')
                .insert([{
                    thread_id: event.threadId,
                    user_id: event.userId,
                    event_type: event.type,
                    metadata: event.metadata,
                    created_at: event.timestamp
                }]);

            if (error) throw error;

            // Emit event for real-time updates
            this.emit('thread:event', event);
        } catch (error) {
            console.error('Error tracking thread event:', error);
            throw error;
        }
    }

    public async getThreadMetrics(threadId: string): Promise<ThreadMetrics> {
        try {
            // Try to get from cache first
            const cachedMetrics = await this.cacheService.get<ThreadMetrics>(`thread:metrics:${threadId}`);
            if (cachedMetrics) {
                return cachedMetrics;
            }

            // Get from materialized view
            const { data, error } = await supabase
                .from('thread_activity_summary')
                .select('*')
                .eq('thread_id', threadId)
                .single();

            if (error) {
                throw error;
            }

            const metrics: ThreadMetrics = {
                threadId: data.thread_id,
                createdAt: new Date(data.created_at),
                lastActivity: new Date(data.last_activity),
                messageCount: data.message_count,
                participantCount: data.participant_count,
                activeParticipants: data.active_participants,
                averageResponseTime: data.average_response_time,
                depth: data.depth,
                branchCount: data.branch_count,
                engagementScore: data.engagement_score
            };

            // Cache the metrics
            await this.cacheService.set(`thread:metrics:${threadId}`, metrics, 60); // Cache for 1 minute

            return metrics;
        } catch (error) {
            console.error('Error fetching thread metrics:', error);
            throw new Error('Failed to fetch metrics');
        }
    }

    public async getThreadPerformance(threadId: string): Promise<ThreadPerformanceMetrics> {
        try {
            // Try to get from cache first
            const cachedPerformance = await this.cacheService.get<ThreadPerformanceMetrics>(`thread:performance:${threadId}`);
            if (cachedPerformance) {
                return cachedPerformance;
            }

            // Get from materialized view
            const { data, error } = await supabase
                .from('thread_activity_summary')
                .select('*')
                .eq('thread_id', threadId)
                .single();

            if (error) {
                throw error;
            }

            const performance: ThreadPerformanceMetrics = {
                threadId: data.thread_id,
                loadTime: data.load_time,
                messageLatency: data.message_latency,
                cacheHitRate: data.cache_hit_rate,
                errorRate: data.error_rate,
                resourceUsage: {
                    cpu: data.cpu_usage,
                    memory: data.memory_usage,
                    network: data.network_usage
                },
                timestamp: new Date(data.performance_timestamp)
            };

            // Cache the performance metrics
            await this.cacheService.set(`thread:performance:${threadId}`, performance, 30); // Cache for 30 seconds

            return performance;
        } catch (error) {
            console.error('Error fetching thread performance:', error);
            throw new Error('Failed to fetch performance metrics');
        }
    }

    public async generateThreadReport(threadId: string, startDate: Date, endDate: Date): Promise<ThreadReport> {
        try {
            // Try to get from cache first
            const cacheKey = `thread:report:${threadId}:${startDate.getTime()}:${endDate.getTime()}`;
            const cachedReport = await this.cacheService.get<ThreadReport>(cacheKey);
            if (cachedReport) {
                return cachedReport;
            }

            // Get metrics and performance from materialized view
            const { data: summary, error: summaryError } = await supabase
                .from('thread_activity_summary')
                .select('*')
                .eq('thread_id', threadId)
                .single();

            if (summaryError) {
                throw summaryError;
            }

            // Get hourly trends
            const { data: trends, error: trendsError } = await supabase
                .from('thread_hourly_trends')
                .select('*')
                .eq('thread_id', threadId)
                .gte('hour', startDate)
                .lte('hour', endDate)
                .order('hour', { ascending: true });

            if (trendsError) {
                throw trendsError;
            }

            // Transform trends data
            const messageVolume = trends.map(t => t.avg_message_volume);
            const participantActivity = trends.map(t => t.avg_participant_activity);
            const responseTimes = trends.map(t => t.avg_response_time);
            const errors = trends.map(t => t.total_errors);

            const report: ThreadReport = {
                threadId,
                period: { start: startDate, end: endDate },
                metrics: {
                    threadId: summary.thread_id,
                    createdAt: new Date(summary.created_at),
                    lastActivity: new Date(summary.last_activity),
                    messageCount: summary.message_count,
                    participantCount: summary.participant_count,
                    activeParticipants: summary.active_participants,
                    averageResponseTime: summary.average_response_time,
                    depth: summary.depth,
                    branchCount: summary.branch_count,
                    engagementScore: summary.engagement_score
                },
                performance: {
                    threadId: summary.thread_id,
                    loadTime: summary.load_time,
                    messageLatency: summary.message_latency,
                    cacheHitRate: summary.cache_hit_rate,
                    errorRate: summary.error_rate,
                    resourceUsage: {
                        cpu: summary.cpu_usage,
                        memory: summary.memory_usage,
                        network: summary.network_usage
                    },
                    timestamp: new Date(summary.performance_timestamp)
                },
                trends: {
                    messageVolume,
                    participantActivity,
                    responseTimes,
                    errors
                },
                insights: await this.generateInsights(threadId, trends)
            };

            // Cache the report
            await this.cacheService.set(cacheKey, report, 300); // Cache for 5 minutes

            return report;
        } catch (error) {
            console.error('Error generating thread report:', error);
            throw new Error('Failed to generate thread report');
        }
    }

    private startMetricsCollection(): void {
        // Update metrics periodically
        setInterval(async () => {
            try {
                await this.updateThreadMetrics();
            } catch (error) {
                console.error('Error updating thread metrics:', error);
            }
        }, this.METRICS_UPDATE_INTERVAL);

        // Check performance periodically
        setInterval(async () => {
            try {
                await this.checkThreadPerformance();
            } catch (error) {
                console.error('Error checking thread performance:', error);
            }
        }, this.PERFORMANCE_CHECK_INTERVAL);

        // Generate reports periodically
        setInterval(async () => {
            try {
                await this.generatePeriodicReports();
            } catch (error) {
                console.error('Error generating periodic reports:', error);
            }
        }, this.REPORT_GENERATION_INTERVAL);
    }

    private async updateThreadMetrics(): Promise<void> {
        const { data: activeThreads, error } = await supabase
            .from('threads')
            .select('id')
            .eq('status', 'active');

        if (error) throw error;

        for (const thread of activeThreads) {
            await this.updateSingleThreadMetrics(thread.id);
        }
    }

    private async updateSingleThreadMetrics(threadId: string): Promise<void> {
        try {
            // Fetch thread data
            const { data: thread, error: threadError } = await supabase
                .from('threads')
                .select(`
                    *,
                    messages (count),
                    thread_participants (count)
                `)
                .eq('id', threadId)
                .single();

            if (threadError) throw threadError;

            // Fetch active participants (active in last 15 minutes)
            const { data: activeParticipants, error: participantsError } = await supabase
                .from('thread_participants')
                .select('user_id')
                .eq('thread_id', threadId)
                .gte('last_activity', new Date(Date.now() - 15 * 60 * 1000).toISOString());

            if (participantsError) throw participantsError;

            // Calculate average response time
            const { data: messages, error: messagesError } = await supabase
                .from('messages')
                .select('created_at, parent_id')
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;

            let totalResponseTime = 0;
            let responseCount = 0;
            
            for (let i = 1; i < messages.length; i++) {
                if (messages[i].parent_id === messages[i-1].id) {
                    const responseTime = new Date(messages[i].created_at).getTime() - 
                                      new Date(messages[i-1].created_at).getTime();
                    totalResponseTime += responseTime;
                    responseCount++;
                }
            }

            const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

            // Calculate thread depth and branching
            const messageTree = new Map<string, string[]>();
            let maxDepth = 0;
            let branchCount = 0;

            messages.forEach(msg => {
                if (!messageTree.has(msg.parent_id || 'root')) {
                    messageTree.set(msg.parent_id || 'root', []);
                }
                messageTree.get(msg.parent_id || 'root')!.push(msg.id);
            });

            const calculateDepth = (nodeId: string, currentDepth: number) => {
                maxDepth = Math.max(maxDepth, currentDepth);
                const children = messageTree.get(nodeId) || [];
                if (children.length > 1) branchCount++;
                children.forEach(child => calculateDepth(child, currentDepth + 1));
            };

            calculateDepth('root', 0);

            // Calculate engagement score
            const engagementScore = this.calculateEngagementScore({
                messageFrequency: messages.length / ((Date.now() - new Date(thread.created_at).getTime()) / (24 * 60 * 60 * 1000)),
                participantRatio: activeParticipants.length / thread.thread_participants.count,
                responseRate: responseCount / (messages.length - 1),
                branchingFactor: branchCount / messages.length
            });

            // Update metrics in database
            const { error: updateError } = await supabase
                .from('thread_metrics')
                .upsert({
                    thread_id: threadId,
                    created_at: thread.created_at,
                    last_activity: new Date(),
                    message_count: thread.messages.count,
                    participant_count: thread.thread_participants.count,
                    active_participants: activeParticipants.length,
                    average_response_time: averageResponseTime,
                    depth: maxDepth,
                    branch_count: branchCount,
                    engagement_score: engagementScore
                });

            if (updateError) throw updateError;

        } catch (error) {
            console.error('Error updating thread metrics:', error);
            throw error;
        }
    }

    private async checkThreadPerformance(): Promise<void> {
        try {
            const { data: activeThreads, error: threadsError } = await supabase
                .from('threads')
                .select('id')
                .eq('status', 'active');

            if (threadsError) throw threadsError;

            for (const thread of activeThreads) {
                // Get cache statistics
                const cacheStats = await this.cacheService.getStats(`thread:${thread.id}`);
                
                // Get message delivery latency
                const latencyStats = await this.monitoringService.getLatencyStats(`thread:${thread.id}`);
                
                // Get resource usage
                const resourceStats = await this.monitoringService.getResourceStats(`thread:${thread.id}`);

                // Calculate error rate
                const { data: errors, error: errorsError } = await supabase
                    .from('error_logs')
                    .select('count')
                    .eq('thread_id', thread.id)
                    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
                    .single();

                if (errorsError) throw errorsError;

                const errorRate = errors.count / (latencyStats.totalRequests || 1);

                // Store performance metrics
                const { error: insertError } = await supabase
                    .from('thread_performance')
                    .insert({
                        thread_id: thread.id,
                        load_time: latencyStats.averageLoadTime,
                        message_latency: latencyStats.averageMessageLatency,
                        cache_hit_rate: cacheStats.hitRate,
                        error_rate: errorRate,
                        cpu_usage: resourceStats.cpu,
                        memory_usage: resourceStats.memory,
                        network_usage: resourceStats.network
                    });

                if (insertError) throw insertError;

                // Check for performance issues
                this.checkPerformanceThresholds({
                    threadId: thread.id,
                    loadTime: latencyStats.averageLoadTime,
                    messageLatency: latencyStats.averageMessageLatency,
                    cacheHitRate: cacheStats.hitRate,
                    errorRate,
                    resourceUsage: resourceStats
                });
            }
        } catch (error) {
            console.error('Error checking thread performance:', error);
            throw error;
        }
    }

    private async generatePeriodicReports(): Promise<void> {
        try {
            const { data: activeThreads, error: threadsError } = await supabase
                .from('threads')
                .select('id')
                .eq('status', 'active');

            if (threadsError) throw threadsError;

            const now = new Date();
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            for (const thread of activeThreads) {
                // Generate hourly report
                const report = await this.generateThreadReport(thread.id, hourAgo, now);

                // Store trends
                const { error: trendsError } = await supabase
                    .from('thread_trends')
                    .insert({
                        thread_id: thread.id,
                        message_volume: report.metrics.messageCount,
                        participant_activity: report.metrics.activeParticipants,
                        response_times: report.trends.responseTimes,
                        error_count: Math.round(report.performance.errorRate * report.metrics.messageCount)
                    });

                if (trendsError) throw trendsError;

                // Emit report event
                this.emit('thread:report', {
                    threadId: thread.id,
                    report
                });
            }
        } catch (error) {
            console.error('Error generating periodic reports:', error);
            throw error;
        }
    }

    private async generateInsights(threadId: string, trends: any[]): Promise<ThreadReport['insights']> {
        const insights: ThreadReport['insights'] = [];

        try {
            // Analyze message volume trends
            const volumeTrend = this.analyzeTrend(trends.map(t => t.message_volume));
            if (Math.abs(volumeTrend) > 0.1) {
                insights.push({
                    type: volumeTrend > 0 ? 'success' : 'warning',
                    message: `Message volume has ${volumeTrend > 0 ? 'increased' : 'decreased'} by ${Math.abs(volumeTrend * 100).toFixed(1)}%`,
                    metric: 'message_volume',
                    change: volumeTrend
                });
            }

            // Analyze participant activity
            const activityTrend = this.analyzeTrend(trends.map(t => t.participant_activity));
            if (Math.abs(activityTrend) > 0.1) {
                insights.push({
                    type: activityTrend > 0 ? 'success' : 'warning',
                    message: `Participant activity has ${activityTrend > 0 ? 'increased' : 'decreased'} by ${Math.abs(activityTrend * 100).toFixed(1)}%`,
                    metric: 'participant_activity',
                    change: activityTrend
                });
            }

            // Analyze response times
            const responseTrend = this.analyzeTrend(trends.map(t => t.response_times).map(times => times.reduce((a, b) => a + b, 0) / times.length));
            if (Math.abs(responseTrend) > 0.1) {
                insights.push({
                    type: responseTrend < 0 ? 'success' : 'warning',
                    message: `Average response time has ${responseTrend < 0 ? 'decreased' : 'increased'} by ${Math.abs(responseTrend * 100).toFixed(1)}%`,
                    metric: 'response_times',
                    change: responseTrend
                });
            }

            // Analyze error rates
            const errorTrend = this.analyzeTrend(trends.map(t => t.error_count));
            if (Math.abs(errorTrend) > 0.1) {
                insights.push({
                    type: errorTrend < 0 ? 'success' : 'warning',
                    message: `Error rate has ${errorTrend < 0 ? 'decreased' : 'increased'} by ${Math.abs(errorTrend * 100).toFixed(1)}%`,
                    metric: 'error_count',
                    change: errorTrend
                });
            }

            return insights;
        } catch (error) {
            console.error('Error generating insights:', error);
            return [];
        }
    }

    private calculateEngagementScore(metrics: {
        messageFrequency: number;
        participantRatio: number;
        responseRate: number;
        branchingFactor: number;
    }): number {
        // Weights for different factors
        const weights = {
            messageFrequency: 0.3,
            participantRatio: 0.3,
            responseRate: 0.2,
            branchingFactor: 0.2
        };

        // Normalize and combine scores
        return (
            (Math.min(metrics.messageFrequency, 10) / 10) * weights.messageFrequency +
            metrics.participantRatio * weights.participantRatio +
            metrics.responseRate * weights.responseRate +
            (Math.min(metrics.branchingFactor, 0.5) / 0.5) * weights.branchingFactor
        ) * 100;
    }

    private analyzeTrend(values: number[]): number {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        
        return first === 0 ? 0 : (last - first) / first;
    }

    private checkPerformanceThresholds(metrics: {
        threadId: string;
        loadTime: number;
        messageLatency: number;
        cacheHitRate: number;
        errorRate: number;
        resourceUsage: {
            cpu: number;
            memory: number;
            network: number;
        };
    }): void {
        const thresholds = {
            loadTime: 1000, // 1 second
            messageLatency: 500, // 500ms
            cacheHitRate: 0.8, // 80%
            errorRate: 0.01, // 1%
            cpu: 0.8, // 80%
            memory: 0.8, // 80%
            network: 0.8 // 80%
        };

        if (metrics.loadTime > thresholds.loadTime) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'load_time',
                value: metrics.loadTime,
                threshold: thresholds.loadTime
            });
        }

        if (metrics.messageLatency > thresholds.messageLatency) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'message_latency',
                value: metrics.messageLatency,
                threshold: thresholds.messageLatency
            });
        }

        if (metrics.cacheHitRate < thresholds.cacheHitRate) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'cache_hit_rate',
                value: metrics.cacheHitRate,
                threshold: thresholds.cacheHitRate
            });
        }

        if (metrics.errorRate > thresholds.errorRate) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'error_rate',
                value: metrics.errorRate,
                threshold: thresholds.errorRate
            });
        }

        if (metrics.resourceUsage.cpu > thresholds.cpu) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'cpu_usage',
                value: metrics.resourceUsage.cpu,
                threshold: thresholds.cpu
            });
        }

        if (metrics.resourceUsage.memory > thresholds.memory) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'memory_usage',
                value: metrics.resourceUsage.memory,
                threshold: thresholds.memory
            });
        }

        if (metrics.resourceUsage.network > thresholds.network) {
            this.emit('thread:performance:warning', {
                threadId: metrics.threadId,
                metric: 'network_usage',
                value: metrics.resourceUsage.network,
                threshold: thresholds.network
            });
        }
    }

    public async startRealtimeTracking(threadId: string): Promise<void> {
        if (this.performanceChannels.has(threadId)) return;

        try {
            // Subscribe to real-time performance updates
            const channel = this.webSocketService.subscribe(
                `thread-performance:${threadId}`,
                (payload) => {
                    this.handleRealtimeUpdate(threadId, payload);
                }
            );

            // Start sending real-time updates
            this.performanceChannels.set(threadId, true);
            this.startThreadPerformanceTracking(threadId);

            // Emit subscription event
            this.emit('thread:realtime:started', { threadId });
        } catch (error) {
            console.error('Error starting realtime tracking:', error);
            throw error;
        }
    }

    public async stopRealtimeTracking(threadId: string): Promise<void> {
        if (!this.performanceChannels.has(threadId)) return;

        try {
            // Clear tracking interval
            const intervalId = this.performanceIntervals.get(threadId);
            if (intervalId) {
                clearInterval(intervalId);
                this.performanceIntervals.delete(threadId);
            }

            // Unsubscribe from real-time updates
            await this.webSocketService.unsubscribe(`thread-performance:${threadId}`);
            this.performanceChannels.delete(threadId);

            // Emit unsubscription event
            this.emit('thread:realtime:stopped', { threadId });
        } catch (error) {
            console.error('Error stopping realtime tracking:', error);
            throw error;
        }
    }

    private setupRealtimeUpdates(): void {
        // Listen for thread events that require performance tracking
        this.on('thread:event', async (event: ThreadAnalyticsEvent) => {
            if (event.type === 'thread_created') {
                await this.startRealtimeTracking(event.threadId);
            } else if (event.type === 'thread_deleted') {
                await this.stopRealtimeTracking(event.threadId);
            }
        });

        // Handle WebSocket reconnection
        this.webSocketService.on('reconnect', async () => {
            // Resubscribe to all active channels
            for (const [threadId] of this.performanceChannels) {
                await this.startRealtimeTracking(threadId);
            }
        });
    }

    private async startThreadPerformanceTracking(threadId: string): Promise<void> {
        const trackPerformance = async () => {
            if (!this.performanceChannels.has(threadId)) return;

            try {
                // Get real-time performance metrics
                const cacheStats = await this.cacheService.getStats(`thread:${threadId}`);
                const latencyStats = await this.monitoringService.getLatencyStats(`thread:${threadId}`);
                const resourceStats = await this.monitoringService.getResourceStats(`thread:${threadId}`);

                // Calculate error rate for the last minute
                const { data: errors } = await supabase
                    .from('error_logs')
                    .select('count')
                    .eq('thread_id', threadId)
                    .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString())
                    .single();

                const errorRate = (errors?.count || 0) / (latencyStats.totalRequests || 1);

                // Create performance update
                const performanceUpdate: ThreadPerformanceMetrics = {
                    threadId,
                    loadTime: latencyStats.averageLoadTime,
                    messageLatency: latencyStats.averageMessageLatency,
                    cacheHitRate: cacheStats.hitRate,
                    errorRate,
                    resourceUsage: {
                        cpu: resourceStats.cpu,
                        memory: resourceStats.memory,
                        network: resourceStats.network
                    },
                    timestamp: new Date()
                };

                // Store metrics
                await supabase
                    .from('thread_performance')
                    .insert([{
                        thread_id: threadId,
                        load_time: performanceUpdate.loadTime,
                        message_latency: performanceUpdate.messageLatency,
                        cache_hit_rate: performanceUpdate.cacheHitRate,
                        error_rate: performanceUpdate.errorRate,
                        cpu_usage: performanceUpdate.resourceUsage.cpu,
                        memory_usage: performanceUpdate.resourceUsage.memory,
                        network_usage: performanceUpdate.resourceUsage.network
                    }]);

                // Broadcast update
                this.webSocketService.broadcast(
                    `thread-performance:${threadId}`,
                    performanceUpdate
                );

                // Check thresholds
                this.checkPerformanceThresholds({
                    threadId,
                    loadTime: performanceUpdate.loadTime,
                    messageLatency: performanceUpdate.messageLatency,
                    cacheHitRate: performanceUpdate.cacheHitRate,
                    errorRate: performanceUpdate.errorRate,
                    resourceUsage: performanceUpdate.resourceUsage
                });

            } catch (error) {
                console.error('Error tracking real-time performance:', error);
                this.emit('thread:realtime:error', {
                    threadId,
                    error
                });
            }
        };

        // Start tracking
        const intervalId = setInterval(trackPerformance, this.REALTIME_UPDATE_INTERVAL);

        // Store interval ID for cleanup
        this.performanceIntervals.set(threadId, intervalId);

        // Initial tracking
        await trackPerformance();
    }

    private handleRealtimeUpdate(threadId: string, payload: any): void {
        try {
            // Emit performance update event
            this.emit('thread:performance:update', {
                threadId,
                metrics: payload as ThreadPerformanceMetrics
            });

            // Update local cache if needed
            this.cacheService.set(
                `thread:${threadId}:performance`,
                payload,
                60 // Cache for 1 minute
            );
        } catch (error) {
            console.error('Error handling realtime update:', error);
        }
    }

    public cleanup(): void {
        // Clear all intervals
        for (const [threadId, intervalId] of this.performanceIntervals) {
            clearInterval(intervalId);
            this.performanceIntervals.delete(threadId);
        }

        // Unsubscribe from all channels
        for (const [threadId] of this.performanceChannels) {
            this.webSocketService.unsubscribe(`thread-performance:${threadId}`);
        }
        this.performanceChannels.clear();
    }

    public async exportReport(threadId: string, format: ExportFormat, period?: { start: Date; end: Date }): Promise<string | Uint8Array> {
        try {
            // Generate report for the specified period or last 24 hours
            const end = new Date();
            const start = period?.start || new Date(end.getTime() - 24 * 60 * 60 * 1000);
            const report = await this.generateThreadReport(threadId, start, end);

            // Export in the requested format
            switch (format) {
                case 'csv':
                    return await this.reportExporter.exportToCsv(report);
                case 'json':
                    return this.reportExporter.exportToJson(report);
                case 'pdf':
                    return await this.reportExporter.exportToPdf(report);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            throw error;
        }
    }

    public async exportBatchReports(threadIds: string[], format: ExportFormat, period?: { start: Date; end: Date }): Promise<Map<string, string | Uint8Array>> {
        try {
            const results = new Map<string, string | Uint8Array>();

            // Export reports in parallel
            await Promise.all(
                threadIds.map(async (threadId) => {
                    try {
                        const result = await this.exportReport(threadId, format, period);
                        results.set(threadId, result);
                    } catch (error) {
                        console.error(`Error exporting report for thread ${threadId}:`, error);
                        // Store error message in results
                        results.set(threadId, `Error: ${error.message}`);
                    }
                })
            );

            return results;
        } catch (error) {
            console.error('Error exporting batch reports:', error);
            throw error;
        }
    }
} 