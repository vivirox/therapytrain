import { CacheAlert } from './CacheMonitoringService'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { WebClient } from '@slack/web-api'

export interface NotificationConfig {
  enabled: boolean
  channels: {
    email?: {
      enabled: boolean
      recipients: string[]
    }
    slack?: {
      enabled: boolean
      channel: string
    }
  }
  throttle: {
    maxNotifications: number
    windowMs: number
  }
}

export class NotificationService {
  private static instance: NotificationService
  private supabase
  private emailTransport
  private slackClient
  private sentNotifications: Map<string, number[]>

  private constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Initialize email transport if configured
    if (process.env.SMTP_HOST) {
      this.emailTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    }

    // Initialize Slack client if configured
    if (process.env.SLACK_TOKEN) {
      this.slackClient = new WebClient(process.env.SLACK_TOKEN)
    }

    this.sentNotifications = new Map()
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private async getNotificationConfig(): Promise<NotificationConfig> {
    const { data, error } = await this.supabase
      .from('notification_config')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching notification config:', error)
      return {
        enabled: false,
        channels: {},
        throttle: {
          maxNotifications: 10,
          windowMs: 3600000, // 1 hour
        },
      }
    }

    return data
  }

  private shouldThrottle(alertId: string, config: NotificationConfig): boolean {
    const now = Date.now()
    const notifications = this.sentNotifications.get(alertId) || []
    
    // Remove notifications outside the window
    const recentNotifications = notifications.filter(
      time => now - time < config.throttle.windowMs
    )
    
    this.sentNotifications.set(alertId, recentNotifications)
    
    return recentNotifications.length >= config.throttle.maxNotifications
  }

  private async sendEmailNotification(
    alert: CacheAlert,
    config: NotificationConfig
  ) {
    if (!this.emailTransport || !config.channels.email?.enabled) return

    const subject = `Cache Alert: ${alert.type}`
    const text = `
      Alert Type: ${alert.type}
      Current Value: ${alert.value}
      Threshold: ${alert.threshold}
      Timestamp: ${new Date().toISOString()}
    `

    try {
      await this.emailTransport.sendMail({
        from: process.env.SMTP_FROM,
        to: config.channels.email.recipients.join(','),
        subject,
        text,
      })
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  private async sendSlackNotification(
    alert: CacheAlert,
    config: NotificationConfig
  ) {
    if (!this.slackClient || !config.channels.slack?.enabled) return

    try {
      await this.slackClient.chat.postMessage({
        channel: config.channels.slack.channel,
        text: `🚨 *Cache Alert*\nType: ${alert.type}\nValue: ${alert.value}\nThreshold: ${alert.threshold}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *Cache Alert*\n*Type:* ${alert.type}\n*Value:* ${alert.value}\n*Threshold:* ${alert.threshold}`,
            },
          },
        ],
      })
    } catch (error) {
      console.error('Error sending Slack notification:', error)
    }
  }

  public async notify(alert: CacheAlert) {
    const config = await this.getNotificationConfig()
    if (!config.enabled) return

    const alertId = `${alert.type}-${alert.threshold}`
    if (this.shouldThrottle(alertId, config)) {
      console.log(`Notification throttled for alert: ${alertId}`)
      return
    }

    // Record this notification
    const notifications = this.sentNotifications.get(alertId) || []
    notifications.push(Date.now())
    this.sentNotifications.set(alertId, notifications)

    // Send notifications through configured channels
    await Promise.all([
      this.sendEmailNotification(alert, config),
      this.sendSlackNotification(alert, config),
    ])
  }

  public async clearNotificationHistory() {
    this.sentNotifications.clear()
  }
} 