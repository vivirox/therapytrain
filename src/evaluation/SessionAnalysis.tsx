import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Message } from '@/types/ClientProfile';
import { SessionAnalysisProps } from '@/types/ComponentProps';

interface Analysis {
  summary: string;
  recommendations: string[];
  metrics: {
    effectiveness: number;
    engagement: number;
    progress: number;
  };
  patterns: {
    emotional: Record<string, number>;
    therapeutic: Record<string, number>;
    interventions: Record<string, number>;
  };
}

const SessionAnalysis: React.FC<SessionAnalysisProps> = ({ sessionId, onGenerateReport }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [sessionId]);

  const analyzeSession = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to analyze session');

      const analysis = await response.json();
      setAnalysis(analysis);

      const report = {
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        metrics: {
          effectiveness: analysis.metrics.effectiveness,
          engagement: analysis.metrics.engagement,
          progress: analysis.metrics.progress,
        },
      };

      onGenerateReport(report);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to analyze session'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div>Loading session data...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!messages.length) return <div>No messages found for this session.</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-2xl font-bold mb-4">Session Analysis</h2>

        <div className="space-y-6">
          {analysis ? (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                <p className="text-gray-700">{analysis.summary}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Key Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Effectiveness</p>
                    <p className="text-2xl font-bold">{analysis.metrics.effectiveness}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Engagement</p>
                    <p className="text-2xl font-bold">{analysis.metrics.engagement}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="text-2xl font-bold">{analysis.metrics.progress}/10</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Patterns Identified</h3>
                <div className="space-y-2">
                  {Object.entries(analysis.patterns.emotional).map(([emotion, count]: any) => (
                    <div key={emotion} className="flex justify-between items-center">
                      <span className="text-sm">{emotion}</span>
                      <Badge variant="outline">{count} occurrences</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
                <ul className="list-disc list-inside space-y-2">
                  {analysis.recommendations.map((rec: any, index: any) => (
                    <li key={index} className="text-gray-700">{rec}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Click the button below to analyze this session and generate insights.
              </p>
              <Button
                onClick={analyzeSession}
                disabled={generating}
              >
                {generating ? 'Analyzing...' : 'Analyze Session'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Session Timeline</h3>
        <div className="space-y-4">
          {messages.map((message: any, index: any) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">
                    {message.role === 'user' ? 'Therapist' : 'Client'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {message.analysis?.patterns && (
                  <div className="flex gap-2">
                    {message.analysis.patterns.map((pattern: any, i: any) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-gray-700">{message.content}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionAnalysis;
