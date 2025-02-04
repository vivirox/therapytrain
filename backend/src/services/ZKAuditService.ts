import { SecurityAuditService } from './SecurityAuditService';
import { SupabaseClient } from '@supabase/supabase-js';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface ZKMetrics {
    proofGenerationTime: number[];
    verificationTime: number[];
    cacheHitRate: number;
    workerUtilization: number[];
    errorRate: number;
}

interface ZKAuditEvent {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp: number;
    data: any;
    metadata: {
        workerId?: string;
        inputHash?: string;
        proofHash?: string;
        duration?: number;
    };
}

export class ZKAuditService extends EventEmitter {
    private metrics: ZKMetrics = {
        proofGenerationTime: [],
        verificationTime: [],
        cacheHitRate: 0,
        workerUtilization: [],
        errorRate: 0
    };

    private totalEvents = 0;
    private errorEvents = 0;
    private cacheHits = 0;
    private cacheMisses = 0;
    private readonly dashboardClients = new Set<WebSocket>();

    constructor(
        private supabase: SupabaseClient,
        private securityAuditService: SecurityAuditService,
        private readonly metricsWindow = 1000, // Keep last 1000 measurements
        private readonly metricUpdateInterval = 5000 // Update metrics every 5 seconds
    ) {
        super();
        this.startMetricsUpdate();
    }

    async recordAuditEvent(event: ZKAuditEvent): Promise<void> {
        try {
            // Record in Supabase
            const { error } = await this.supabase
                .from('zk_audit_logs')
                .insert({
                    type: event.type,
                    severity: event.severity,
                    timestamp: new Date(event.timestamp).toISOString(),
                    data: event.data,
                    metadata: event.metadata
                });

            if (error) throw error;

            // Update metrics
            this.updateMetrics(event);

            // Emit event for real-time monitoring
            this.emit('audit-event', event);

            // Forward to security audit service if needed
            if (event.severity === 'HIGH') {
                await this.securityAuditService.recordAlert(
                    event.type,
                    event.severity,
                    event.data
                );
            }

            // Broadcast to dashboard clients
            this.broadcastMetrics();
        } catch (error) {
            console.error('Error recording audit event:', error);
            throw error;
        }
    }

    private updateMetrics(event: ZKAuditEvent): void {
        this.totalEvents++;

        switch (event.type) {
            case 'PROOF_GENERATED':
                this.updateProofGenerationMetrics(event);
                break;
            case 'PROOF_VERIFIED':
                this.updateVerificationMetrics(event);
                break;
            case 'PROOF_CACHE_HIT':
                this.cacheHits++;
                break;
            case 'PROOF_CACHE_MISS':
                this.cacheMisses++;
                break;
            case 'WORKER_ERROR':
            case 'PROOF_GENERATION_ERROR':
            case 'PROOF_VERIFICATION_ERROR':
                this.errorEvents++;
                break;
        }

        // Update cache hit rate
        const totalCacheEvents = this.cacheHits + this.cacheMisses;
        this.metrics.cacheHitRate = totalCacheEvents > 0 
            ? this.cacheHits / totalCacheEvents 
            : 0;

        // Update error rate
        this.metrics.errorRate = this.totalEvents > 0 
            ? this.errorEvents / this.totalEvents 
            : 0;
    }

    private updateProofGenerationMetrics(event: ZKAuditEvent): void {
        if (event.metadata.duration) {
            this.metrics.proofGenerationTime.push(event.metadata.duration);
            if (this.metrics.proofGenerationTime.length > this.metricsWindow) {
                this.metrics.proofGenerationTime.shift();
            }
        }

        if (event.metadata.workerId !== undefined) {
            const workerIndex = parseInt(event.metadata.workerId);
            this.metrics.workerUtilization[workerIndex] = 
                (this.metrics.workerUtilization[workerIndex] || 0) + 1;
        }
    }

    private updateVerificationMetrics(event: ZKAuditEvent): void {
        if (event.metadata.duration) {
            this.metrics.verificationTime.push(event.metadata.duration);
            if (this.metrics.verificationTime.length > this.metricsWindow) {
                this.metrics.verificationTime.shift();
            }
        }
    }

    private startMetricsUpdate(): void {
        setInterval(() => {
            this.broadcastMetrics();
        }, this.metricUpdateInterval);
    }

    private broadcastMetrics(): void {
        const metricsPayload = {
            timestamp: Date.now(),
            metrics: {
                ...this.metrics,
                averageProofTime: this.calculateAverage(this.metrics.proofGenerationTime),
                averageVerificationTime: this.calculateAverage(this.metrics.verificationTime),
                totalEvents: this.totalEvents,
                errorEvents: this.errorEvents
            }
        };

        for (const client of this.dashboardClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(metricsPayload));
            }
        }
    }

    private calculateAverage(numbers: number[]): number {
        return numbers.length > 0
            ? numbers.reduce((a, b) => a + b, 0) / numbers.length
            : 0;
    }

    async getHistoricalMetrics(
        startTime: Date,
        endTime: Date
    ): Promise<ZKAuditEvent[]> {
        const { data, error } = await this.supabase
            .from('zk_audit_logs')
            .select('*')
            .gte('timestamp', startTime.toISOString())
            .lte('timestamp', endTime.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return data;
    }

    registerDashboardClient(client: WebSocket): void {
        this.dashboardClients.add(client);
        client.on('close', () => {
            this.dashboardClients.delete(client);
        });
    }

    async cleanup(): Promise<void> {
        // Close all dashboard connections
        for (const client of this.dashboardClients) {
            client.close();
        }
        this.dashboardClients.clear();

        // Clear metrics
        this.metrics = {
            proofGenerationTime: [],
            verificationTime: [],
            cacheHitRate: 0,
            workerUtilization: [],
            errorRate: 0
        };
    }
}
