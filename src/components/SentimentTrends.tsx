import { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { SentimentTrend } from '@/services/sentimentAnalysis';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  trends: SentimentTrend[];
  className?: string;
}

const SentimentTrends = ({ trends, className = '' }: Props) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const data = {
    labels: trends.map(t => new Date(t.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Sentiment Score',
        data: trends.map(t => t.score),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        min: -5,
        max: 5,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Sentiment Trends Over Time',
      },
    },
  };

  return (
    <div className={`w-full h-64 ${className}`}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default SentimentTrends;
