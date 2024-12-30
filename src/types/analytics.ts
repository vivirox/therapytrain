import { Usage } from './usage'
import { USAGE_METRICS } from './usage'

interface MetricItem {
  id: string
  value: number
  label: string
  chatSessions?: boolean
  chatEngagement?: boolean
  responseTime?: Array<number>
  usageData?: Array<Usage>
}

interface AnalyticsData {
  sessions: Array<{ id: string; value: number; label: string }>
  engagement: Array<{ id: string; value: number; label: string }>
  satisfaction: Array<{ id: string; value: number; label: string }>
}

export const THERAPY_METRICS = {
  sessions: [
    {
      id: 'total-sessions',
      value: 0,
      label: 'Total Sessions',
      chatSessions: true,
      usageData: USAGE_METRICS.sessions
    }
  ],
  engagement: [
    {
      id: 'message-count', 
      value: 0,
      label: 'Messages',
      chatEngagement: true,
      usageData: USAGE_METRICS.messages
    }
  ],
  satisfaction: [
    {
      id: 'response-time',
      value: 0,
      label: 'Avg Response Time',
      responseTime: [],
      usageData: USAGE_METRICS.responseTime
    }
  ]}