import { supabase } from '@/lib/supabaseclient';
import { EmailTrackingService } from '../../email-tracking';
import { AlertService } from '../../alert-service';
import { SpamDetectionService } from '../../spam-detection';

describe('Email Tracking Integration', () => {
  const testEmail = {
    id: 'test-email-id',
    recipient: 'test@example.com',
    sender: 'sender@example.com',
  };

  beforeEach(async () => {
    // Clean up test data
    await supabase.from('email_events').delete().match({ email_id: testEmail.id });
    await supabase.from('alerts').delete().match({ sender: testEmail.sender });
  });

  afterAll(async () => {
    // Final cleanup
    await supabase.from('email_events').delete().match({ email_id: testEmail.id });
    await supabase.from('alerts').delete().match({ sender: testEmail.sender });
  });

  describe('Email Lifecycle Tracking', () => {
    it('should track complete email lifecycle with all events', async () => {
      // 1. Track email sent
      await EmailTrackingService.trackEvent({
        email_id: testEmail.id,
        type: 'sent',
        recipient: testEmail.recipient,
        metadata: { subject: 'Test Email' },
      });

      // Verify sent event
      const { data: sentEvent } = await supabase
        .from('email_events')
        .select('*')
        .match({ email_id: testEmail.id, type: 'sent' })
        .single();

      expect(sentEvent).toBeTruthy();
      expect(sentEvent.recipient).toBe(testEmail.recipient);

      // 2. Track delivery
      await EmailTrackingService.trackDelivery(testEmail.id, testEmail.recipient);

      // Verify delivery event
      const { data: deliveryEvent } = await supabase
        .from('email_events')
        .select('*')
        .match({ email_id: testEmail.id, type: 'delivered' })
        .single();

      expect(deliveryEvent).toBeTruthy();
      expect(deliveryEvent.delivered_at).toBeTruthy();

      // 3. Track open
      await EmailTrackingService.trackOpen(
        testEmail.id,
        testEmail.recipient,
        'test-agent',
        '127.0.0.1'
      );

      // Verify open event
      const { data: openEvent } = await supabase
        .from('email_events')
        .select('*')
        .match({ email_id: testEmail.id, type: 'opened' })
        .single();

      expect(openEvent).toBeTruthy();
      expect(openEvent.user_agent).toBe('test-agent');
      expect(openEvent.ip_address).toBe('127.0.0.1');

      // 4. Track click
      const clickUrl = 'https://example.com';
      await EmailTrackingService.trackClick(
        testEmail.id,
        testEmail.recipient,
        clickUrl,
        'test-agent',
        '127.0.0.1'
      );

      // Verify click event
      const { data: clickEvent } = await supabase
        .from('email_events')
        .select('*')
        .match({ email_id: testEmail.id, type: 'clicked' })
        .single();

      expect(clickEvent).toBeTruthy();
      expect(clickEvent.metadata).toEqual({ url: clickUrl });
    });
  });

  describe('Spam Detection Integration', () => {
    it('should detect spam patterns and create alerts', async () => {
      // Create multiple bounce events to trigger spam detection
      for (let i = 0; i < 5; i++) {
        await EmailTrackingService.trackBounce(
          `${testEmail.id}-${i}`,
          testEmail.recipient,
          'Invalid recipient'
        );
      }

      // Analyze sender
      const spamResult = await SpamDetectionService.analyzeSender(testEmail.sender);
      expect(spamResult.isSpam).toBe(true);
      expect(spamResult.signals.bounceRate).toBeGreaterThan(0);

      // Check if alerts were created
      await AlertService.checkMetricsAndAlert(testEmail.sender);

      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .match({ sender: testEmail.sender, type: 'bounce_rate' });

      expect(alerts).toBeTruthy();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('critical');
    });
  });

  describe('Analytics Integration', () => {
    it('should calculate correct metrics from events', async () => {
      // Create a series of events
      const events = [
        { type: 'sent', count: 10 },
        { type: 'delivered', count: 8 },
        { type: 'opened', count: 6 },
        { type: 'clicked', count: 4 },
        { type: 'bounced', count: 2 },
      ];

      // Create events
      for (const event of events) {
        for (let i = 0; i < event.count; i++) {
          await EmailTrackingService.trackEvent({
            email_id: `${testEmail.id}-${event.type}-${i}`,
            type: event.type as any,
            recipient: testEmail.recipient,
          });
        }
      }

      // Query metrics view
      const { data: metrics } = await supabase
        .from('email_metrics')
        .select('*')
        .single();

      expect(metrics).toBeTruthy();
      expect(metrics.sent).toBe(10);
      expect(metrics.delivered).toBe(8);
      expect(metrics.opened).toBe(6);
      expect(metrics.clicked).toBe(4);
      expect(metrics.bounced).toBe(2);

      // Calculate rates
      const deliveryRate = metrics.delivered / metrics.sent;
      const openRate = metrics.opened / metrics.delivered;
      const clickRate = metrics.clicked / metrics.delivered;
      const bounceRate = metrics.bounced / metrics.sent;

      expect(deliveryRate).toBe(0.8); // 80% delivery rate
      expect(openRate).toBe(0.75); // 75% open rate
      expect(clickRate).toBe(0.5); // 50% click rate
      expect(bounceRate).toBe(0.2); // 20% bounce rate
    });
  });

  describe('Alert System Integration', () => {
    it('should manage alert lifecycle', async () => {
      // Create conditions for an alert
      for (let i = 0; i < 5; i++) {
        await EmailTrackingService.trackSpam(
          `${testEmail.id}-${i}`,
          testEmail.recipient
        );
      }

      // Check metrics and create alert
      await AlertService.checkMetricsAndAlert(testEmail.sender);

      // Verify alert was created
      const { data: activeAlerts } = await supabase
        .from('alerts')
        .select('*')
        .match({ sender: testEmail.sender, type: 'spam_reports' })
        .is('resolved_at', null);

      expect(activeAlerts).toBeTruthy();
      expect(activeAlerts.length).toBe(1);
      const alertId = activeAlerts[0].id;

      // Acknowledge alert
      await AlertService.acknowledgeAlert(alertId);

      // Verify acknowledgment
      const { data: acknowledgedAlert } = await supabase
        .from('alerts')
        .select('*')
        .match({ id: alertId })
        .single();

      expect(acknowledgedAlert.acknowledged_at).toBeTruthy();

      // Resolve alert
      await AlertService.resolveAlert(alertId);

      // Verify resolution
      const { data: resolvedAlert } = await supabase
        .from('alerts')
        .select('*')
        .match({ id: alertId })
        .single();

      expect(resolvedAlert.resolved_at).toBeTruthy();
    });
  });
}); 