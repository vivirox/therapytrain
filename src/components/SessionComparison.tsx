import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import SessionAnalytics, {
  type SessionComparison as SessionComparisonType
} from '@/services/sessionAnalytics';

interface Props {
  clientId: string;
  sessionId: string;
  className?: string;
}

const SessionComparison = ({ clientId, sessionId, className = '' }: Props) => {
  const [comparisons, setComparisons] = useState<SessionComparisonType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComparisons = async () => {
      try {
        const data = await SessionAnalytics.compareWithPreviousSessions(
          clientId,
          sessionId
        );
        setComparisons(data);
      } catch (error) {
        console.error('Error fetching session comparisons:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparisons();
  }, [clientId, sessionId]);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${(change * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className={`${className} min-h-[400px] flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </Card>
    );
  }

  const chartData = comparisons.map(c => ({
    date: c.date,
    sentiment: c.metrics.averageSentiment,
    engagement: c.metrics.engagementScore,
    effectiveness: c.metrics.interventionCount / c.metrics.duration
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Session Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="metrics">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            {comparisons.map((comparison, index) => (
              <Card key={index} className="p-4">
                <h3 className="font-medium mb-2">Session on {comparison.date}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Sentiment Change</p>
                    <p className={getChangeColor(comparison.improvement.sentiment)}>
                      {formatChange(comparison.improvement.sentiment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Engagement Change</p>
                    <p className={getChangeColor(comparison.improvement.engagement)}>
                      {formatChange(comparison.improvement.engagement)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">Key Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {comparison.metrics.topicsCovered.map((topic, i) => (
                      <Badge key={i} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="trends">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sentiment"
                    stroke="#8884d8"
                    name="Sentiment"
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="#82ca9d"
                    name="Engagement"
                  />
                  <Line
                    type="monotone"
                    dataKey="effectiveness"
                    stroke="#ffc658"
                    name="Effectiveness"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {comparisons.map((comparison, index) => (
              <div key={index} className="space-y-2">
                <h3 className="font-medium">Session on {comparison.date}</h3>
                <ul className="space-y-2">
                  {comparison.metrics.keyInsights.map((insight, i) => (
                    <li key={i} className="text-sm text-gray-600">
                      • {insight}
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  {comparison.significantChanges.map((change, i) => (
                    <Badge
                      key={i}
                      variant={change.significance === 'improved' ? 'default' : 'destructive'}
                      className="mr-2 mb-2"
                    >
                      {change.metric}: {formatChange(change.change)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SessionComparison;
