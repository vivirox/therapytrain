import { supabase } from '@/lib/supabaseClient';

interface SpamSignals {
  bounceRate: number;
  spamReports: number;
  rapidSendRate: boolean;
  suspiciousPatterns: boolean;
  riskScore: number;
}

interface SpamDetectionResult {
  isSpam: boolean;
  signals: SpamSignals;
  reason: string[];
}

export class SpamDetectionService {
  private static BOUNCE_RATE_THRESHOLD = 0.05; // 5%
  private static SPAM_REPORTS_THRESHOLD = 0.02; // 2%
  private static RAPID_SEND_THRESHOLD = 100; // emails per minute
  private static RISK_SCORE_THRESHOLD = 0.7; // 70%

  /**
   * Analyze email sending patterns for a specific sender
   */
  static async analyzeSender(sender: string): Promise<SpamDetectionResult> {
    const signals = await this.gatherSignals(sender);
    const reasons: string[] = [];

    // Check bounce rate
    if (signals.bounceRate > this.BOUNCE_RATE_THRESHOLD) {
      reasons.push(`High bounce rate: ${(signals.bounceRate * 100).toFixed(1)}%`);
    }

    // Check spam reports
    if (signals.spamReports > this.SPAM_REPORTS_THRESHOLD) {
      reasons.push(`High spam reports: ${(signals.spamReports * 100).toFixed(1)}%`);
    }

    // Check rapid sending
    if (signals.rapidSendRate) {
      reasons.push('Suspicious sending pattern detected');
    }

    // Check suspicious patterns
    if (signals.suspiciousPatterns) {
      reasons.push('Suspicious content or behavior patterns detected');
    }

    return {
      isSpam: signals.riskScore > this.RISK_SCORE_THRESHOLD || reasons.length > 1,
      signals,
      reason: reasons,
    };
  }

  /**
   * Gather various signals for spam detection
   */
  private static async gatherSignals(sender: string): Promise<SpamSignals> {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - 24); // Last 24 hours

    // Get total emails sent
    const { count: totalSent } = await supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .eq('type', 'sent')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString());

    // Get bounces
    const { count: bounces } = await supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .eq('type', 'bounced')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString());

    // Get spam reports
    const { count: spamReports } = await supabase
      .from('email_events')
      .select('*', { count: 'exact' })
      .eq('type', 'spam')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString());

    // Check for rapid sending
    const { data: sendingPattern } = await supabase
      .from('email_events')
      .select('created_at')
      .eq('type', 'sent')
      .eq('sender', sender)
      .gte('created_at', timeWindow.toISOString())
      .order('created_at', { ascending: true });

    // Calculate sending rate (emails per minute)
    const rapidSendRate = this.detectRapidSending(sendingPattern || []);

    // Check for suspicious patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns(sender);

    // Calculate risk score
    const riskScore = this.calculateRiskScore({
      bounceRate: bounces / totalSent,
      spamReports: spamReports / totalSent,
      rapidSendRate,
      suspiciousPatterns,
    });

    return {
      bounceRate: bounces / totalSent,
      spamReports: spamReports / totalSent,
      rapidSendRate,
      suspiciousPatterns,
      riskScore,
    };
  }

  /**
   * Detect rapid sending patterns
   */
  private static detectRapidSending(events: { created_at: string }[]): boolean {
    if (events.length < 2) return false;

    // Group events by minute
    const sendingRates = new Map<string, number>();
    events.forEach(event => {
      const minute = new Date(event.created_at).toISOString().slice(0, 16);
      sendingRates.set(minute, (sendingRates.get(minute) || 0) + 1);
    });

    // Check if any minute exceeds the threshold
    return Array.from(sendingRates.values()).some(rate => rate > this.RAPID_SEND_THRESHOLD);
  }

  /**
   * Detect suspicious patterns in email content and behavior
   */
  private static async detectSuspiciousPatterns(sender: string): Promise<boolean> {
    const { data: recentEvents } = await supabase
      .from('email_events')
      .select('metadata')
      .eq('sender', sender)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!recentEvents) return false;

    // Analyze patterns in metadata
    const patterns = recentEvents.reduce((acc, event) => {
      const metadata = event.metadata || {};
      
      // Check for suspicious URLs
      const hasSuspiciousUrls = metadata.urls?.some((url: string) => 
        this.isSuspiciousUrl(url)
      );

      // Check for suspicious keywords
      const hasSuspiciousKeywords = metadata.content?.some((content: string) =>
        this.containsSuspiciousKeywords(content)
      );

      return {
        suspiciousUrls: acc.suspiciousUrls || hasSuspiciousUrls,
        suspiciousKeywords: acc.suspiciousKeywords || hasSuspiciousKeywords,
      };
    }, { suspiciousUrls: false, suspiciousKeywords: false });

    return patterns.suspiciousUrls || patterns.suspiciousKeywords;
  }

  /**
   * Check if a URL is suspicious
   */
  private static isSuspiciousUrl(url: string): boolean {
    const suspiciousPatterns = [
      /bit\.ly/i,
      /tinyurl\.com/i,
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
      /[a-zA-Z0-9]+\.[a-zA-Z]{2,3}\/[a-zA-Z0-9]{20,}/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if content contains suspicious keywords
   */
  private static containsSuspiciousKeywords(content: string): boolean {
    const suspiciousKeywords = [
      /\b(viagra|cialis)\b/i,
      /\b(casino|gambling|bet)\b/i,
      /\b(lottery|prize|winner)\b/i,
      /\b(urgent|action required|account suspended)\b/i,
      /\b(wire transfer|bank account|verify account)\b/i,
    ];

    return suspiciousKeywords.some(keyword => keyword.test(content));
  }

  /**
   * Calculate overall risk score
   */
  private static calculateRiskScore(signals: Omit<SpamSignals, 'riskScore'>): number {
    const weights = {
      bounceRate: 0.3,
      spamReports: 0.3,
      rapidSendRate: 0.2,
      suspiciousPatterns: 0.2,
    };

    return (
      (signals.bounceRate / this.BOUNCE_RATE_THRESHOLD) * weights.bounceRate +
      (signals.spamReports / this.SPAM_REPORTS_THRESHOLD) * weights.spamReports +
      (signals.rapidSendRate ? 1 : 0) * weights.rapidSendRate +
      (signals.suspiciousPatterns ? 1 : 0) * weights.suspiciousPatterns
    );
  }
} 