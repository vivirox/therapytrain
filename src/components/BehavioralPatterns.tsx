import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsService } from '@/services/analytics';
import { Badge } from '@/components/ui/badge';

interface Pattern {
  pattern: string;
  description: string;
  significance: number;
}

interface Props {
  clientId: string;
  className?: string;
}

const BehavioralPatterns = ({ clientId, className = '' }: Props) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const analytics = await AnalyticsService.generateLearningInsights(clientId);
        const patterns = analytics.patterns || [];
        setPatterns(patterns);
      } catch (error) {
        console.error('Error fetching behavioral patterns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatterns();
  }, [clientId]);

  const getSignificanceColor = (significance: number) => {
    if (significance >= 0.8) return 'bg-red-500';
    if (significance >= 0.5) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (isLoading) {
    return (
      <Card className={`${className} min-h-[300px] flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Behavioral Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patterns.map((pattern, index) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{pattern.pattern}</h3>
                <Badge 
                  variant="secondary" 
                  className={`${getSignificanceColor(pattern.significance)} text-white`}
                >
                  {Math.round(pattern.significance * 100)}% Confidence
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{pattern.description}</p>
            </div>
          ))}
          
          {patterns.length === 0 && (
            <div className="text-center text-gray-500">
              No behavioral patterns detected yet. Continue interacting to generate insights.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BehavioralPatterns;
