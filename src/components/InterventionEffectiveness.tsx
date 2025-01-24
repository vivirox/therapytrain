import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Suspense, LazyExoticComponent } from 'react';
import { Loading } from './ui/loading';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InterventionMetrics, { 
  type EffectivenessScore 
} from '@/services/interventionMetrics';

interface Props {
  sessionId: string;
  className?: string;
}

const InterventionEffectiveness = ({ sessionId, className = '' }: Props) => {
  const [effectiveness, setEffectiveness] = useState<EffectivenessScore | null>(null);
  const [timeframe, setTimeframe] = useState<'session' | 'day' | 'week' | 'month'>('session');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEffectiveness = async () => {
      try {
        const data = await InterventionMetrics.calculateEffectiveness(
          sessionId,
          timeframe
        );
        setEffectiveness(data);
      } catch (error) {
        console.error('Error fetching intervention effectiveness:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEffectiveness();
  }, [sessionId, timeframe]);

  if (isLoading || !effectiveness) {
    return (
      <Card className={`${className} min-h-[400px] flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </Card>
    );
  }

  const componentData = Object.entries(effectiveness.components).map(
    ([name, value]) => ({
      x: name.replace(/([A-Z])/g, ' $1').trim(),
      y: value * 100
    })
  );

  const timeOfDayData = Object.entries(effectiveness.trends.timeOfDay).map(
    ([hour, value]) => ({
      x: `${hour}:00`,
      y: value * 100
    })
  );

  const typeData = Object.entries(effectiveness.trends.byType).map(
    ([type, value]) => ({
      x: type,
      y: value * 100
    })
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Intervention Effectiveness</span>
          <div className="text-sm font-normal">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="border rounded p-1"
            >
              <option value="session">This Session</option>
              <option value="day">Past Day</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="types">Types</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="text-center py-8">
              <div className="text-4xl font-bold">
                {(effectiveness.overall * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Overall Effectiveness
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Recommendations</h3>
              <ul className="space-y-2">
                {effectiveness.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="components">
            <Suspense fallback={<Loading message="Loading component data..." />}>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <LineChart data={componentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" label={{ value: "Component", position: "bottom" }} />
                    <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="y" stroke="#0066FF" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="timing">
            <Suspense fallback={<Loading message="Loading time of day data..." />}>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <LineChart data={timeOfDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" label={{ value: "Time", position: "bottom" }} />
                    <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="y" stroke="#44FF44" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="types">
            <Suspense fallback={<Loading message="Loading type data..." />}>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <LineChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" label={{ value: "Type", position: "bottom" }} />
                    <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="y" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InterventionEffectiveness;
