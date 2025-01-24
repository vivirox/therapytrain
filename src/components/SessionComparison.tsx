import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import React, { Suspense } from 'react';
import { Loading } from './ui/loading';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  const engagementData = comparisons.map(c => ({
    x: new Date(c.date).toLocaleDateString(),
    y: c.metrics.engagementScore
  }));

  const riskData = comparisons.map(c => ({
    x: new Date(c.date).toLocaleDateString(),
    y: c.metrics.riskLevel
  }));

  const interventionData = comparisons.map(c => ({
    x: new Date(c.date).toLocaleDateString(),
    y: c.metrics.interventionCount
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
            <div className="space-y-6">
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">Session Metrics Over Time</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Suspense fallback={<Loading message="Loading engagement data..." />}>
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-2">Engagement Score</h3>
                      <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                          <LineChart data={engagementData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" label={{ value: "Date", position: "bottom" }} />
                            <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="y" stroke="#0066FF" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Suspense>

                  <Suspense fallback={<Loading message="Loading risk data..." />}>
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-2">Risk Level</h3>
                      <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                          <LineChart data={riskData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" label={{ value: "Date", position: "bottom" }} />
                            <YAxis label={{ value: "Level", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="y" stroke="#FF4444" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Suspense>

                  <Suspense fallback={<Loading message="Loading intervention data..." />}>
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-2">Interventions</h3>
                      <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                          <LineChart data={interventionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" label={{ value: "Date", position: "bottom" }} />
                            <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="y" stroke="#00CC88" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Suspense>
                </div>
              </Card>
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
