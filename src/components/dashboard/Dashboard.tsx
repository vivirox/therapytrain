import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardService } from '../../services/DashboardService';
import { Container, Stack } from '../layout/Container';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import {
    ChartBarIcon,
    ServerIcon,
    CpuChipIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardProps {
    className?: string;
    refreshInterval?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
    className = '',
    refreshInterval = 5000
}) => {
    const [metrics, setMetrics] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { handleError } = useErrorHandler();
    const { showToast } = useToast();
    const dashboardService = DashboardService.getInstance();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const currentMetrics = dashboardService.getMetrics();
                setMetrics(currentMetrics);
                setAlerts(dashboardService.getAlerts());
                setIsLoading(false);
            } catch (error) {
                handleError(error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, refreshInterval);

        // Listen for real-time updates
        dashboardService.on('metrics:update', setMetrics);
        dashboardService.on('alert', (alert) => {
            setAlerts(prev => [alert, ...prev]);
            showToast(alert.type, alert.message);
        });

        return () => {
            clearInterval(interval);
            dashboardService.removeListener('metrics:update', setMetrics);
        };
    }, [refreshInterval, handleError, showToast]);

    if (isLoading) {
        return (
            <Container className="h-full flex items-center justify-center">
                <Spinner size="lg" />
            </Container>
        );
    }

    return (
        <ErrorBoundary>
            <Container className={`p-6 ${className}`}>
                <Stack spacing="6">
                    {/* System Overview */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">System Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard
                                title="Uptime"
                                value={formatUptime(metrics.system.uptime)}
                                icon={ServerIcon}
                            />
                            <MetricCard
                                title="Error Rate"
                                value={`${(metrics.system.errorRate * 100).toFixed(2)}%`}
                                icon={ExclamationTriangleIcon}
                                status={metrics.system.errorRate > 0.1 ? 'error' : 'success'}
                            />
                            <MetricCard
                                title="Average Latency"
                                value={`${metrics.system.averageLatency.toFixed(2)}ms`}
                                icon={ChartBarIcon}
                                status={metrics.system.averageLatency > 100 ? 'warning' : 'success'}
                            />
                            <MetricCard
                                title="Active Nodes"
                                value={metrics.loadBalancing.activeNodes}
                                icon={CpuChipIcon}
                                status={metrics.loadBalancing.activeNodes < 2 ? 'warning' : 'success'}
                            />
                        </div>
                    </section>

                    {/* Cache Performance */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Cache Performance</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MetricCard
                                title="Hit Rate"
                                value={`${(metrics.cache.hitRate * 100).toFixed(2)}%`}
                                status={metrics.cache.hitRate < 0.8 ? 'warning' : 'success'}
                            />
                            <MetricCard
                                title="Memory Usage"
                                value={`${(metrics.cache.memoryUsage * 100).toFixed(2)}%`}
                                status={metrics.cache.memoryUsage > 0.9 ? 'error' : 'success'}
                            />
                            <MetricCard
                                title="Active Keys"
                                value={metrics.cache.hotKeys.length}
                            />
                        </div>
                    </section>

                    {/* Node Health */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Node Health</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {Array.from(metrics.loadBalancing.nodeHealth).map(([nodeId, health]: [string, any]) => (
                                <NodeHealthCard
                                    key={nodeId}
                                    nodeId={nodeId}
                                    health={health}
                                />
                            ))}
                        </div>
                    </section>

                    {/* System Performance */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">System Performance</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard
                                title="CPU Usage"
                                value={`${metrics.performance.cpu.toFixed(2)}%`}
                                status={metrics.performance.cpu > 80 ? 'error' : 'success'}
                            />
                            <MetricCard
                                title="Memory Usage"
                                value={`${metrics.performance.memory.toFixed(2)}%`}
                                status={metrics.performance.memory > 85 ? 'error' : 'success'}
                            />
                            <MetricCard
                                title="Network I/O"
                                value={formatBytes(metrics.performance.networkIO)}
                            />
                            <MetricCard
                                title="Disk I/O"
                                value={formatBytes(metrics.performance.diskIO)}
                            />
                        </div>
                    </section>

                    {/* Recent Alerts */}
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Recent Alerts</h2>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {alerts.slice(0, 5).map(alert => (
                                    <AlertCard
                                        key={alert.id}
                                        alert={alert}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>
                </Stack>
            </Container>
        </ErrorBoundary>
    );
};

const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon?: React.ComponentType<any>;
    status?: 'success' | 'warning' | 'error';
}> = ({ title, value, icon: Icon, status = 'success' }) => {
    const statusColors = {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800'
    };

    return (
        <div className={`p-4 rounded-lg ${statusColors[status]}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{title}</h3>
                {Icon && <Icon className="w-5 h-5" />}
            </div>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
};

const NodeHealthCard: React.FC<{
    nodeId: string;
    health: {
        status: string;
        load: number;
        errorRate: number;
    };
}> = ({ nodeId, health }) => {
    const statusColors = {
        healthy: 'bg-green-100 text-green-800',
        degraded: 'bg-yellow-100 text-yellow-800',
        unhealthy: 'bg-red-100 text-red-800'
    };

    return (
        <div className={`p-4 rounded-lg ${statusColors[health.status as keyof typeof statusColors]}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Node {nodeId}</h3>
                <span className="text-sm capitalize">{health.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm">Load</p>
                    <p className="text-lg font-semibold">{(health.load * 100).toFixed(2)}%</p>
                </div>
                <div>
                    <p className="text-sm">Error Rate</p>
                    <p className="text-lg font-semibold">
                        {(health.errorRate * 100).toFixed(2)}%
                    </p>
                </div>
            </div>
        </div>
    );
};

const AlertCard: React.FC<{
    alert: any;
}> = ({ alert }) => {
    const typeColors = {
        error: 'bg-red-100 text-red-800 border-red-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-lg border ${typeColors[alert.type as keyof typeof typeColors]}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                    </p>
                </div>
                <span className="text-sm capitalize">{alert.source}</span>
            </div>
        </motion.div>
    );
};

// Utility functions
const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}; 