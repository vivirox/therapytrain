import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from './ui/card';
import { SentimentTrend } from '@/services/sentimentAnalysis';

interface Props {
  trends: SentimentTrend[];
  className?: string;
}

const SentimentTrends = ({ trends, className = '' }: Props) => {
  const chartData = trends.map(point => ({
    x: new Date(point.timestamp).toLocaleDateString(),
    y: point.score
  }));

  return (
    <div className={`w-full h-64 ${className}`}>
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Sentiment Trends</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" label={{ value: "Date", position: "bottom" }} />
              <YAxis label={{ value: "Sentiment Score", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#0066FF" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default SentimentTrends;
