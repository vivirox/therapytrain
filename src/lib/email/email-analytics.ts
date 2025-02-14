import { supabase } from '@/lib/supabaseClient';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DeliveryMetrics {
  totalSent: number;
  delivered: number;
  bounced: number;
  deliveryRate: number;
  bounceRate: number;
}

interface EngagementMetrics {
  totalDelivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

interface TimeBasedMetric {
  date: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
}

interface DomainMetric {
  domain: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
}

export class EmailAnalyticsService {
  static async getDeliveryMetrics(period: DateRange): Promise<DeliveryMetrics> {
    const { data: events } = await supabase
      .from('email_events')
      .select('type, count')
      .gte('created_at', period.startDate)
      .lte('created_at', period.endDate)
      .in('type', ['sent', 'delivered', 'bounced']);

    const metrics = {
      totalSent: 0,
      delivered: 0,
      bounced: 0,
      deliveryRate: 0,
      bounceRate: 0,
    };

    if (!events || events.length === 0) {
      return metrics;
    }

    events.forEach((event) => {
      switch (event.type) {
        case 'sent':
          metrics.totalSent = event.count;
          break;
        case 'delivered':
          metrics.delivered = event.count;
          break;
        case 'bounced':
          metrics.bounced = event.count;
          break;
      }
    });

    if (metrics.totalSent > 0) {
      metrics.deliveryRate = metrics.delivered / metrics.totalSent;
      metrics.bounceRate = metrics.bounced / metrics.totalSent;
    }

    return metrics;
  }

  static async getEngagementMetrics(period: DateRange): Promise<EngagementMetrics> {
    const { data: events } = await supabase
      .from('email_events')
      .select('type, count')
      .gte('created_at', period.startDate)
      .lte('created_at', period.endDate)
      .in('type', ['delivered', 'opened', 'clicked']);

    const metrics = {
      totalDelivered: 0,
      opened: 0,
      clicked: 0,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
    };

    if (!events || events.length === 0) {
      return metrics;
    }

    events.forEach((event) => {
      switch (event.type) {
        case 'delivered':
          metrics.totalDelivered = event.count;
          break;
        case 'opened':
          metrics.opened = event.count;
          break;
        case 'clicked':
          metrics.clicked = event.count;
          break;
      }
    });

    if (metrics.totalDelivered > 0) {
      metrics.openRate = metrics.opened / metrics.totalDelivered;
      metrics.clickRate = metrics.clicked / metrics.totalDelivered;
    }

    if (metrics.opened > 0) {
      metrics.clickToOpenRate = metrics.clicked / metrics.opened;
    }

    return metrics;
  }

  static async getTimeBasedMetrics(period: DateRange, granularity: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const { data } = await supabase
      .from('email_metrics_by_date')
      .select('date, sent, delivered, opened, clicked')
      .gte('date', period.startDate)
      .lte('date', period.endDate)
      .order('date', { ascending: true });

    if (!data || data.length === 0) {
      return { periods: [] };
    }

    const periods: TimeBasedMetric[] = data.map((row) => ({
      date: row.date,
      metrics: {
        sent: row.sent,
        delivered: row.delivered,
        opened: row.opened,
        clicked: row.clicked,
        deliveryRate: row.sent > 0 ? row.delivered / row.sent : 0,
        openRate: row.delivered > 0 ? row.opened / row.delivered : 0,
        clickRate: row.delivered > 0 ? row.clicked / row.delivered : 0,
      },
    }));

    return { periods };
  }

  static async getRecipientMetrics(period: DateRange) {
    const { data } = await supabase
      .from('email_metrics_by_domain')
      .select('domain, sent, delivered, opened, clicked')
      .gte('date', period.startDate)
      .lte('date', period.endDate)
      .order('sent', { ascending: false });

    if (!data || data.length === 0) {
      return { domains: [] };
    }

    const domains: DomainMetric[] = data.map((row) => ({
      domain: row.domain,
      metrics: {
        sent: row.sent,
        delivered: row.delivered,
        opened: row.opened,
        clicked: row.clicked,
        deliveryRate: row.sent > 0 ? row.delivered / row.sent : 0,
        openRate: row.delivered > 0 ? row.opened / row.delivered : 0,
        clickRate: row.delivered > 0 ? row.clicked / row.delivered : 0,
      },
    }));

    return { domains };
  }
} 