import { EventEmitter } from 'events';
import { AnalyticsService } from './analytics';
import { DashboardService } from './DashboardService';
import { MonitoringService } from './MonitoringService';
import { SmartCacheService } from './SmartCacheService';
import { LoadBalancerService } from './LoadBalancerService';
import { RedisService } from './RedisService';
import type { 
    AnalyticsEvent,
    LearningAnalytics,
    PerformanceMetrics,
    AIModelMetrics,
    RealTimeMetrics
} from '../types/services/analytics';

interface TrendAnalysis {
    metric: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
    confidence: number;
    prediction?: number;
}

interface SystemInsight {
    type: 'performance' | 'security' | 'usage' | 'learning';
    severity: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
    metrics: Record<string, number>;
    timestamp: number;
}

interface AdvancedMetrics {
    system: {
        predictedLoad: number;
        resourceUtilization: number;
        healthScore: number;
        anomalyScore: number;
    };
    learning: {
        engagementScore: number;
        retentionRate: number;
        skillGrowthRate: number;
        learningEfficiency: number;
    };
    performance: {
        predictedLatency: number;
        scalabilityScore: number;
        reliabilityScore: number;
        optimizationScore: number;
    };
    security: {
        riskScore: number;
        threatLevel: number;
        complianceScore: number;
        vulnerabilityCount: number;
    };
}

export class AdvancedAnalyticsService extends EventEmitter {
    private static instance: AdvancedAnalyticsService;
    private readonly analyticsService: AnalyticsService;
    private readonly dashboardService: DashboardService;
    private readonly monitoringService: MonitoringService;
    private readonly smartCacheService: SmartCacheService;
    private readonly loadBalancerService: LoadBalancerService;
    private readonly redisService: RedisService;

    private metrics: AdvancedMetrics;
    private insights: SystemInsight[] = [];
    private trends: Map<string, TrendAnalysis> = new Map();
    private readonly ANALYSIS_INTERVAL = 300000; // 5 minutes
    private readonly PREDICTION_WINDOW = 3600000; // 1 hour
    private readonly TREND_THRESHOLD = 0.1; // 10% change
    private readonly ANOMALY_THRESHOLD = 2.5; // Standard deviations

    private constructor() {
        super();
        this.analyticsService = AnalyticsService.getInstance();
        this.dashboardService = DashboardService.getInstance();
        this.monitoringService = MonitoringService.getInstance();
        this.smartCacheService = SmartCacheService.getInstance();
        this.loadBalancerService = LoadBalancerService.getInstance();
        this.redisService = RedisService.getInstance();

        this.metrics = this.initializeMetrics();
        this.setupEventListeners();
        this.startAnalysis();
    }

    public static getInstance(): AdvancedAnalyticsService {
        if (!AdvancedAnalyticsService.instance) {
            AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
        }
        return AdvancedAnalyticsService.instance;
    }

    private initializeMetrics(): AdvancedMetrics {
        return {
            system: {
                predictedLoad: 0,
                resourceUtilization: 0,
                healthScore: 100,
                anomalyScore: 0
            },
            learning: {
                engagementScore: 0,
                retentionRate: 0,
                skillGrowthRate: 0,
                learningEfficiency: 0
            },
            performance: {
                predictedLatency: 0,
                scalabilityScore: 0,
                reliabilityScore: 0,
                optimizationScore: 0
            },
            security: {
                riskScore: 0,
                threatLevel: 0,
                complianceScore: 100,
                vulnerabilityCount: 0
            }
        };
    }

    private setupEventListeners(): void {
        // Listen for real-time metrics updates
        this.dashboardService.on('metrics:update', this.handleMetricsUpdate.bind(this));
        this.monitoringService.on('performance', this.handlePerformanceUpdate.bind(this));
        this.smartCacheService.on('analytics', this.handleCacheAnalytics.bind(this));
        this.loadBalancerService.on('health:update', this.handleNodeHealth.bind(this));

        // Listen for security and error events
        this.monitoringService.on('error', this.handleError.bind(this));
        this.monitoringService.on('security', this.handleSecurityEvent.bind(this));
    }

    private startAnalysis(): void {
        setInterval(async () => {
            try {
                await this.performAnalysis();
                this.emit('analysis:complete', {
                    metrics: this.metrics,
                    insights: this.insights,
                    trends: Array.from(this.trends.values())
                });
            } catch (error) {
                console.error('Error performing analysis:', error);
                this.handleError(error);
            }
        }, this.ANALYSIS_INTERVAL);
    }

    private async performAnalysis(): Promise<void> {
        // Analyze system metrics
        await this.analyzeSystemMetrics();
        
        // Analyze learning patterns
        await this.analyzeLearningPatterns();
        
        // Analyze performance trends
        await this.analyzePerformanceTrends();
        
        // Generate insights
        await this.generateInsights();
        
        // Update predictions
        await this.updatePredictions();
    }

    private async analyzeSystemMetrics(): Promise<void> {
        const dashboardMetrics = this.dashboardService.getMetrics();
        const historicalMetrics = await this.dashboardService.getHistoricalMetrics(
            Date.now() - this.PREDICTION_WINDOW,
            Date.now()
        );

        // Calculate resource utilization
        this.metrics.system.resourceUtilization = this.calculateResourceUtilization(dashboardMetrics);
        
        // Calculate health score
        this.metrics.system.healthScore = this.calculateHealthScore(dashboardMetrics);
        
        // Detect anomalies
        this.metrics.system.anomalyScore = this.detectAnomalies(historicalMetrics);
        
        // Predict future load
        this.metrics.system.predictedLoad = this.predictSystemLoad(historicalMetrics);
    }

    private async analyzeLearningPatterns(): Promise<void> {
        const learningMetrics = await this.analyticsService.getLearningMetrics();
        
        this.metrics.learning = {
            engagementScore: this.calculateEngagementScore(learningMetrics),
            retentionRate: this.calculateRetentionRate(learningMetrics),
            skillGrowthRate: this.calculateSkillGrowthRate(learningMetrics),
            learningEfficiency: this.calculateLearningEfficiency(learningMetrics)
        };
    }

    private async analyzePerformanceTrends(): Promise<void> {
        const performanceMetrics = await this.monitoringService.getPerformanceStats();
        
        this.metrics.performance = {
            predictedLatency: this.predictLatency(performanceMetrics),
            scalabilityScore: this.calculateScalabilityScore(performanceMetrics),
            reliabilityScore: this.calculateReliabilityScore(performanceMetrics),
            optimizationScore: this.calculateOptimizationScore(performanceMetrics)
        };
    }

    private async generateInsights(): Promise<void> {
        const newInsights: SystemInsight[] = [];

        // Generate performance insights
        newInsights.push(...this.generatePerformanceInsights());
        
        // Generate security insights
        newInsights.push(...this.generateSecurityInsights());
        
        // Generate usage insights
        newInsights.push(...this.generateUsageInsights());
        
        // Generate learning insights
        newInsights.push(...this.generateLearningInsights());

        // Update insights list
        this.insights = [...newInsights, ...this.insights].slice(0, 100);
        this.emit('insights:update', this.insights);
    }

    private async updatePredictions(): Promise<void> {
        for (const [metric, analysis] of this.trends) {
            const historicalData = await this.getHistoricalData(metric);
            const prediction = this.predictMetric(historicalData);
            
            this.trends.set(metric, {
                ...analysis,
                prediction,
                confidence: this.calculatePredictionConfidence(historicalData)
            });
        }
    }

    // Utility methods for calculations
    private calculateResourceUtilization(metrics: any): number {
        const { cpu, memory, networkIO, diskIO } = metrics.performance;
        return (cpu + memory + (networkIO / 100) + (diskIO / 100)) / 4;
    }

    private calculateHealthScore(metrics: any): number {
        const { errorRate } = metrics.system;
        const { healthyNodes, activeNodes } = metrics.loadBalancing;
        const nodeHealth = healthyNodes / activeNodes;
        const errorScore = Math.max(0, 100 - (errorRate * 1000));
        return (nodeHealth * 50 + errorScore * 50) / 100;
    }

    private detectAnomalies(historicalMetrics: any[]): number {
        if (historicalMetrics.length < 2) return 0;

        // Calculate mean and standard deviation
        const values = historicalMetrics.map(m => m.system.errorRate);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length - 1)
        );

        // Calculate z-score for latest value
        const latestValue = values[values.length - 1];
        const zScore = Math.abs((latestValue - mean) / stdDev);

        // Convert z-score to anomaly score (0-100)
        return Math.min(100, (zScore / this.ANOMALY_THRESHOLD) * 100);
    }

    private predictSystemLoad(historicalMetrics: any[]): number {
        if (historicalMetrics.length < 2) return 0;

        // Simple linear regression for load prediction
        const points = historicalMetrics.map((m, i) => ({
            x: i,
            y: m.system.totalRequests
        }));

        const n = points.length;
        const sumX = points.reduce((sum, p) => sum + p.x, 0);
        const sumY = points.reduce((sum, p) => sum + p.y, 0);
        const sumXY = points.reduce((sum, p) => sum + (p.x * p.y), 0);
        const sumXX = points.reduce((sum, p) => sum + (p.x * p.x), 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Predict next value
        return Math.max(0, intercept + slope * n);
    }

    private calculateEngagementScore(metrics: any): number {
        const {
            timeSpent,
            completionRate,
            averageScore
        } = metrics;

        return (
            (timeSpent / 3600) * 0.3 +  // Time spent weight
            completionRate * 0.4 +       // Completion rate weight
            (averageScore / 100) * 0.3   // Score weight
        ) * 100;
    }

    private calculateRetentionRate(metrics: any): number {
        const { totalSessions, uniqueUsers } = metrics;
        return Math.min(100, (uniqueUsers / totalSessions) * 100);
    }

    private calculateSkillGrowthRate(metrics: any): number {
        const { strengthAreas, improvementAreas } = metrics;
        const totalAreas = strengthAreas.length + improvementAreas.length;
        return totalAreas > 0 ? (strengthAreas.length / totalAreas) * 100 : 0;
    }

    private calculateLearningEfficiency(metrics: any): number {
        const { timeSpent, completionRate, averageScore } = metrics;
        return Math.min(100, (completionRate * averageScore) / (timeSpent / 3600));
    }

    private predictLatency(metrics: any): number {
        const { latencyHistory } = metrics;
        if (!latencyHistory?.length) return 0;

        // Exponential moving average
        const alpha = 0.2;
        return latencyHistory.reduce(
            (ema, value) => alpha * value + (1 - alpha) * ema,
            latencyHistory[0]
        );
    }

    private calculateScalabilityScore(metrics: any): number {
        const { responseTime, throughput, errorRate } = metrics;
        const normalizedTime = Math.min(1, responseTime / 1000);
        const normalizedThroughput = Math.min(1, throughput / 1000);
        const normalizedError = Math.min(1, errorRate);

        return (
            (1 - normalizedTime) * 0.4 +
            normalizedThroughput * 0.4 +
            (1 - normalizedError) * 0.2
        ) * 100;
    }

    private calculateReliabilityScore(metrics: any): number {
        const { uptime, successRate, errorRate } = metrics;
        return (
            (uptime / 100) * 0.4 +
            successRate * 0.4 +
            (1 - errorRate) * 0.2
        ) * 100;
    }

    private calculateOptimizationScore(metrics: any): number {
        const { cacheHitRate, avgResponseTime, resourceUtilization } = metrics;
        return (
            cacheHitRate * 0.4 +
            (1 - avgResponseTime / 1000) * 0.3 +
            (1 - resourceUtilization) * 0.3
        ) * 100;
    }

    private generatePerformanceInsights(): SystemInsight[] {
        const insights: SystemInsight[] = [];
        const { performance, system } = this.metrics;

        if (performance.predictedLatency > 200) {
            insights.push({
                type: 'performance',
                severity: 'high',
                message: 'High latency predicted in the next hour',
                recommendation: 'Consider scaling up resources or optimizing database queries',
                metrics: {
                    predictedLatency: performance.predictedLatency,
                    currentLoad: system.predictedLoad
                },
                timestamp: Date.now()
            });
        }

        if (system.resourceUtilization > 80) {
            insights.push({
                type: 'performance',
                severity: 'medium',
                message: 'High resource utilization detected',
                recommendation: 'Review resource allocation and consider scaling',
                metrics: {
                    resourceUtilization: system.resourceUtilization,
                    healthScore: system.healthScore
                },
                timestamp: Date.now()
            });
        }

        return insights;
    }

    private generateSecurityInsights(): SystemInsight[] {
        const insights: SystemInsight[] = [];
        const { security } = this.metrics;

        if (security.threatLevel > 70) {
            insights.push({
                type: 'security',
                severity: 'high',
                message: 'Elevated security threat level detected',
                recommendation: 'Review security logs and consider additional protection measures',
                metrics: {
                    threatLevel: security.threatLevel,
                    riskScore: security.riskScore
                },
                timestamp: Date.now()
            });
        }

        if (security.vulnerabilityCount > 0) {
            insights.push({
                type: 'security',
                severity: 'medium',
                message: `${security.vulnerabilityCount} vulnerabilities detected`,
                recommendation: 'Review and patch identified vulnerabilities',
                metrics: {
                    vulnerabilityCount: security.vulnerabilityCount,
                    complianceScore: security.complianceScore
                },
                timestamp: Date.now()
            });
        }

        return insights;
    }

    private generateUsageInsights(): SystemInsight[] {
        const insights: SystemInsight[] = [];
        const { system, performance } = this.metrics;

        if (system.predictedLoad > 80) {
            insights.push({
                type: 'usage',
                severity: 'medium',
                message: 'High system load predicted',
                recommendation: 'Consider load balancing or scaling resources',
                metrics: {
                    predictedLoad: system.predictedLoad,
                    scalabilityScore: performance.scalabilityScore
                },
                timestamp: Date.now()
            });
        }

        return insights;
    }

    private generateLearningInsights(): SystemInsight[] {
        const insights: SystemInsight[] = [];
        const { learning } = this.metrics;

        if (learning.engagementScore < 60) {
            insights.push({
                type: 'learning',
                severity: 'medium',
                message: 'Low user engagement detected',
                recommendation: 'Review content and user interaction patterns',
                metrics: {
                    engagementScore: learning.engagementScore,
                    retentionRate: learning.retentionRate
                },
                timestamp: Date.now()
            });
        }

        if (learning.skillGrowthRate < 50) {
            insights.push({
                type: 'learning',
                severity: 'medium',
                message: 'Below average skill growth rate',
                recommendation: 'Analyze learning patterns and adjust content difficulty',
                metrics: {
                    skillGrowthRate: learning.skillGrowthRate,
                    learningEfficiency: learning.learningEfficiency
                },
                timestamp: Date.now()
            });
        }

        return insights;
    }

    private async getHistoricalData(metric: string): Promise<any[]> {
        try {
            const endTime = Date.now();
            const startTime = endTime - this.PREDICTION_WINDOW;
            
            switch (metric) {
                case 'system':
                    return await this.dashboardService.getHistoricalMetrics(startTime, endTime);
                case 'learning':
                    return await this.analyticsService.getMetrics(startTime, endTime);
                case 'performance':
                    return await this.monitoringService.getHistoricalPerformance(startTime, endTime);
                default:
                    return [];
            }
        } catch (error) {
            console.error(`Error fetching historical data for ${metric}:`, error);
            return [];
        }
    }

    private predictMetric(historicalData: any[]): number {
        if (historicalData.length < 2) return 0;

        // Simple moving average prediction
        const window = Math.min(historicalData.length, 5);
        const recentData = historicalData.slice(-window);
        return recentData.reduce((sum, data) => sum + data.value, 0) / window;
    }

    private calculatePredictionConfidence(historicalData: any[]): number {
        if (historicalData.length < 2) return 0;

        // Calculate variance in the data
        const values = historicalData.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length - 1);

        // Convert variance to confidence score (0-1)
        const maxVariance = Math.pow(mean, 2);
        return Math.max(0, Math.min(1, 1 - (variance / maxVariance)));
    }

    private updateTrends(metricType: string, data: any): void {
        const currentValue = this.extractMetricValue(metricType, data);
        const trend = this.trends.get(metricType) || {
            metric: metricType,
            trend: 'stable',
            changeRate: 0,
            confidence: 0
        };

        // Calculate change rate
        const previousValue = trend.prediction || 0;
        const changeRate = previousValue !== 0 
            ? (currentValue - previousValue) / previousValue
            : 0;

        // Update trend direction
        const newTrend: TrendAnalysis = {
            ...trend,
            trend: changeRate > this.TREND_THRESHOLD 
                ? 'increasing' 
                : changeRate < -this.TREND_THRESHOLD 
                    ? 'decreasing' 
                    : 'stable',
            changeRate: Math.abs(changeRate)
        };

        this.trends.set(metricType, newTrend);
    }

    private extractMetricValue(metricType: string, data: any): number {
        switch (metricType) {
            case 'system':
                return data.system?.totalRequests || 0;
            case 'performance':
                return data.performance?.avgResponseTime || 0;
            case 'cache':
                return data.cache?.hitRate || 0;
            case 'node':
                return data.load || 0;
            default:
                return 0;
        }
    }

    private checkPerformanceThresholds(performance: any): void {
        if (performance.avgResponseTime > 200) {
            this.createInsight('performance', {
                message: 'High response time detected',
                data: performance
            });
        }
    }

    private checkCacheOptimization(analytics: any): void {
        if (analytics.hitRate < 0.7) {
            this.createInsight('performance', {
                message: 'Low cache hit rate detected',
                data: analytics
            });
        }
    }

    private checkNodeHealth(health: any): void {
        if (health.status === 'unhealthy') {
            this.createInsight('performance', {
                message: `Node ${health.nodeId} is unhealthy`,
                data: health
            });
        }
    }

    private createInsight(type: string, data: any): void {
        const insight: SystemInsight = {
            type: type as SystemInsight['type'],
            severity: this.calculateSeverity(type, data),
            message: data.message || 'System event detected',
            recommendation: this.generateRecommendation(type, data),
            metrics: this.extractMetrics(data),
            timestamp: Date.now()
        };

        this.insights.unshift(insight);
        this.insights = this.insights.slice(0, 100);
        this.emit('insight', insight);
    }

    private calculateSeverity(type: string, data: any): SystemInsight['severity'] {
        switch (type) {
            case 'error':
                return 'high';
            case 'security':
                return data.threatLevel > 70 ? 'high' : 'medium';
            case 'performance':
                return data.avgResponseTime > 500 ? 'high' : 'medium';
            default:
                return 'low';
        }
    }

    private generateRecommendation(type: string, data: any): string {
        switch (type) {
            case 'error':
                return 'Review error logs and implement error handling';
            case 'security':
                return 'Review security measures and update protection';
            case 'performance':
                return 'Consider scaling resources or optimizing code';
            default:
                return 'Monitor system metrics for further analysis';
        }
    }

    private extractMetrics(data: any): Record<string, number> {
        const metrics: Record<string, number> = {};
        
        if (typeof data === 'object') {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'number') {
                    metrics[key] = value;
                }
            }
        }
        
        return metrics;
    }

    // Event handlers
    private handleMetricsUpdate(metrics: any): void {
        this.updateTrends('system', metrics);
        this.emit('metrics:update', this.metrics);
    }

    private handlePerformanceUpdate(performance: any): void {
        this.updateTrends('performance', performance);
        this.checkPerformanceThresholds(performance);
    }

    private handleCacheAnalytics(analytics: any): void {
        this.updateTrends('cache', analytics);
        this.checkCacheOptimization(analytics);
    }

    private handleNodeHealth(health: any): void {
        this.updateTrends('node', health);
        this.checkNodeHealth(health);
    }

    private handleError(error: Error): void {
        this.metrics.system.healthScore = Math.max(0, this.metrics.system.healthScore - 5);
        this.createInsight('error', error);
    }

    private handleSecurityEvent(event: any): void {
        this.metrics.security.threatLevel = Math.min(100, this.metrics.security.threatLevel + 10);
        this.createInsight('security', event);
    }

    // Public methods
    public getMetrics(): AdvancedMetrics {
        return this.metrics;
    }

    public getInsights(
        type?: SystemInsight['type'],
        severity?: SystemInsight['severity'],
        limit = 10
    ): SystemInsight[] {
        return this.insights
            .filter(insight => 
                (!type || insight.type === type) &&
                (!severity || insight.severity === severity)
            )
            .slice(0, limit);
    }

    public getTrends(metrics: string[]): TrendAnalysis[] {
        return metrics
            .map(metric => this.trends.get(metric))
            .filter((trend): trend is TrendAnalysis => trend !== undefined);
    }

    public async getPredictions(
        metrics: string[],
        timeframe: number
    ): Promise<Record<string, number>> {
        const predictions: Record<string, number> = {};
        
        for (const metric of metrics) {
            const trend = this.trends.get(metric);
            if (trend?.prediction !== undefined) {
                predictions[metric] = trend.prediction;
            }
        }
        
        return predictions;
    }

    public async shutdown(): Promise<void> {
        this.removeAllListeners();
    }
} 