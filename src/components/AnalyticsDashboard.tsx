import React from 'react'
import TherapyAnalytics from './TherapyAnalytics'
import { Chat } from './Chat'
import { useChatAnalytics } from '../hooks/useChatAnalytics'

const AnalyticsDashboard = () => {
  const { analyticsData } = useChatAnalytics()

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-8">
      <h2 className="text-white text-2xl mb-8">Therapy Analytics Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <TherapyAnalytics 
          metrics={analyticsData.sessions} 
          title="Session Activity"
          dataKey="value"
        />
        <TherapyAnalytics 
          metrics={analyticsData.engagement} 
          title="Client Engagement"
          dataKey="value"
        />
        <TherapyAnalytics 
          metrics={analyticsData.satisfaction} 
          title="Response Metrics"
          dataKey="value"
        />
      </div>
      <div className="mt-8">
        <Chat />
      </div>
    </div>
  )
}

export default AnalyticsDashboard