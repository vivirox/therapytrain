import { EventEmitter } from 'events';
import { HIPAACompliantAuditService } from '../HIPAACompliantAuditService';
import { SecurityAuditService } from '../SecurityAuditService';
import { QualityMetricsService } from '../QualityMetricsService';

interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels?: string[];
  description?: string;
  unit?: string;
  alertThresholds?: {
    warning?: number;
    critical?: number;
  };
}

interface MetricValue {
  value: number;
  timestamp: number;
  labels: Record<string, string>;
}

interface MetricSeries {
  config: MetricConfig;
  values: MetricValue[];
}

interface AlertConfig {
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  labels?: Record<string, string>;
}

interface MetricAggregation {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
  p95?: number;
  p99?: number;
}

export class PerformanceMonitoringService extends EventEmitter {
  private metrics: Map<string, MetricSeries>;
  private alerts: Map<string, AlertConfig>;
  private readonly RETENTION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly MAX_SAMPLES = 10000; // Maximum samples per metric
  private maintenanceInterval: NodeJS.Timer;

  constructor(
    private readonly hipaaAuditService: HIPAACompliantAuditService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly qualityMetricsService: QualityMetricsService
  ) {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.startMaintenanceLoop();
  }

  async registerMetric(config: MetricConfig): Promise<void> {
    if (this.metrics.has(config.name)) {
      throw new Error(`Metric ${config.name} already exists`);
    }

    this.metrics.set(config.name, {
      config,
      values: [],
    });

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'CREATE',
        status: 'SUCCESS',
        details: {
          operation: 'REGISTER_METRIC',
          metric: config.name,
          type: config.type,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('metric_registered', {
      name: config.name,
      type: config.type,
    });

    this.emit('metricRegistered', { config });
  }

  async recordMetric(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): Promise<void> {
    const series = this.metrics.get(name);
    if (!series) {
      throw new Error(`Metric ${name} not found`);
    }

    const metricValue: MetricValue = {
      value,
      timestamp: Date.now(),
      labels,
    };

    series.values.push(metricValue);

    // Enforce sample limit
    if (series.values.length > this.MAX_SAMPLES) {
      series.values = series.values.slice(-this.MAX_SAMPLES);
    }

    await this.checkAlerts(name, metricValue);
    await this.qualityMetricsService.recordMetric('metric_recorded', {
      name,
      value,
      labels,
    });

    this.emit('metricRecorded', { name, value: metricValue });
  }

  async registerAlert(name: string, config: AlertConfig): Promise<void> {
    if (!this.metrics.has(config.metric)) {
      throw new Error(`Metric ${config.metric} not found`);
    }

    this.alerts.set(name, config);

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'CREATE',
        status: 'SUCCESS',
        details: {
          operation: 'REGISTER_ALERT',
          name,
          metric: config.metric,
        },
      },
    });

    await this.qualityMetricsService.recordMetric('alert_registered', {
      name,
      metric: config.metric,
      condition: config.condition,
      threshold: config.threshold,
    });

    this.emit('alertRegistered', { name, config });
  }

  getMetricValues(
    name: string,
    startTime?: number,
    endTime?: number,
    labels?: Record<string, string>
  ): MetricValue[] {
    const series = this.metrics.get(name);
    if (!series) {
      throw new Error(`Metric ${name} not found`);
    }

    let values = series.values;

    if (startTime) {
      values = values.filter(v => v.timestamp >= startTime);
    }

    if (endTime) {
      values = values.filter(v => v.timestamp <= endTime);
    }

    if (labels) {
      values = values.filter(v =>
        Object.entries(labels).every(
          ([key, value]) => v.labels[key] === value
        )
      );
    }

    return values;
  }

  getMetricAggregation(
    name: string,
    startTime?: number,
    endTime?: number,
    labels?: Record<string, string>
  ): MetricAggregation {
    const values = this.getMetricValues(name, startTime, endTime, labels);
    if (values.length === 0) {
      throw new Error(`No values found for metric ${name}`);
    }

    const numbers = values.map(v => v.value);
    const sorted = [...numbers].sort((a, b) => a - b);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      sum: numbers.reduce((a, b) => a + b, 0),
      count: numbers.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  private async checkAlerts(
    metricName: string,
    value: MetricValue
  ): Promise<void> {
    for (const [alertName, config] of this.alerts.entries()) {
      if (config.metric !== metricName) {
        continue;
      }

      if (config.labels) {
        const labelsMatch = Object.entries(config.labels).every(
          ([key, val]) => value.labels[key] === val
        );
        if (!labelsMatch) {
          continue;
        }
      }

      let triggered = false;
      switch (config.condition) {
        case 'gt':
          triggered = value.value > config.threshold;
          break;
        case 'lt':
          triggered = value.value < config.threshold;
          break;
        case 'eq':
          triggered = value.value === config.threshold;
          break;
      }

      if (triggered) {
        await this.handleAlertTriggered(alertName, config, value);
      }
    }
  }

  private async handleAlertTriggered(
    alertName: string,
    config: AlertConfig,
    value: MetricValue
  ): Promise<void> {
    await this.securityAuditService.recordAlert(
      'PERFORMANCE_ALERT',
      config.severity,
      {
        alert: alertName,
        metric: config.metric,
        value: value.value,
        threshold: config.threshold,
        labels: value.labels,
      }
    );

    await this.qualityMetricsService.recordMetric('alert_triggered', {
      name: alertName,
      metric: config.metric,
      value: value.value,
      threshold: config.threshold,
    });

    this.emit('alertTriggered', {
      alert: alertName,
      config,
      value,
    });
  }

  private startMaintenanceLoop(): void {
    this.maintenanceInterval = setInterval(() => {
      const cutoff = Date.now() - this.RETENTION_PERIOD;

      for (const series of this.metrics.values()) {
        series.values = series.values.filter(v => v.timestamp >= cutoff);
      }
    }, 3600000); // Run maintenance every hour
  }

  async stop(): Promise<void> {
    clearInterval(this.maintenanceInterval);

    await this.hipaaAuditService.logEvent({
      eventType: 'SYSTEM_OPERATION',
      action: {
        type: 'UPDATE',
        status: 'SUCCESS',
        details: {
          operation: 'STOP_PERFORMANCE_MONITORING',
        },
      },
    });
  }
} 