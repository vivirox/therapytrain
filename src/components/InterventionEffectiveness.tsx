import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
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
      name: name.replace(/([A-Z])/g, ' $1').trim(),
      value: value * 100
    })
  );

  const timeOfDayData = Object.entries(effectiveness.trends.timeOfDay).map(
    ([hour, value]) => ({
      hour: `${hour}:00`,
      effectiveness: value * 100
    })
  );

  const typeData = Object.entries(effectiveness.trends.byType).map(
    ([type, value]) => ({
      type,
      effectiveness: value * 100
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
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={componentData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Effectiveness"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="timing">
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeOfDayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar
                    dataKey="effectiveness"
                    fill="#82ca9d"
                    name="Effectiveness %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="types">
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="type" type="category" width={100} />
                  <Tooltip />
                  <Bar
                    dataKey="effectiveness"
                    fill="#8884d8"
                    name="Effectiveness %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InterventionEffectiveness;
