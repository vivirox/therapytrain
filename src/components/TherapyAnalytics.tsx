import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { THERAPY_METRICS } from '../types/analytics'

type MetricData = {
  id: string
  value: number
  label: string
}

interface TherapyAnalyticsProps {
  metrics: Array<MetricData>
  title: string
  dataKey: string
}

const TherapyAnalytics: React.FC<TherapyAnalyticsProps> = ({ metrics, title, dataKey }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-white text-xl mb-4">{title}</h3>
      <BarChart width={300} height={200} data={metrics}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>
    </div>
  )
}

export default TherapyAnalytics