import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientProfile } from '@/types/clientprofile';
import { ProgressVisualization } from '@/components/progress/ProgressVisualization';
import { ProgressTrackingService } from '@/services/progress/ProgressTrackingService';

interface EvaluationCriteria {
    category: string;
    criteria: Array<{
        name: string;
        description: string;
        score: number;
        feedback: string;
    }>;
}

interface SessionData {
    clientId: string;
    sessionStartTime: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

const evaluationCriteria: EvaluationCriteria[] = [
    {
        category: "Therapeutic Alliance",
        criteria: [
            {
                name: "Rapport Building",
                description: "Ability to establish and maintain connection with the client",
                score: 0,
                feedback: ""
            },
            {
                name: "Empathetic Response",
                description: "Demonstration of understanding and validation of client's experience",
                score: 0,
                feedback: ""
            },
            {
                name: "Professional Boundaries",
                description: "Maintenance of appropriate therapeutic boundaries",
                score: 0,
                feedback: ""
            }
        ]
    },
    {
        category: "Clinical Skills",
        criteria: [
            {
                name: "Assessment Skills",
                description: "Ability to gather relevant information and identify key issues",
                score: 0,
                feedback: ""
            },
            {
                name: "Intervention Selection",
                description: "Appropriateness of chosen therapeutic interventions",
                score: 0,
                feedback: ""
            },
            {
                name: "Timing and Pacing",
                description: "Appropriate timing and pacing of interventions",
                score: 0,
                feedback: ""
            }
        ]
    },
    {
        category: "Client Management",
        criteria: [
            {
                name: "Crisis Management",
                description: "Handling of crisis or intense emotional situations",
                score: 0,
                feedback: ""
            },
            {
                name: "Resistance Management",
                description: "Handling of client resistance and defense mechanisms",
                score: 0,
                feedback: ""
            },
            {
                name: "Session Structure",
                description: "Maintenance of session focus and structure",
                score: 0,
                feedback: ""
            }
        ]
    }
];

interface ClientProfile {
  id: string;
  primary_issue: string;
  key_traits: string[];
  // Add other properties as needed
}

const EvaluationPage: React.FC = () => {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [evaluation, setEvaluation] = useState<EvaluationCriteria[]>(evaluationCriteria);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [generating, setGenerating] = useState(false);
    const [progressMetrics, setProgressMetrics] = useState<any>(null);
    const [treatmentAlignment, setTreatmentAlignment] = useState<any>(null);

    useEffect(() => {
        const loadSessionData = async () => {
            if (!router.query) {
                router.push('/clients');
                return;
            }
            setSessionData(router.query as unknown as SessionData);
            // Fetch client data
            const { data: clientData, error } = await createClient
                .from('client_profiles')
                .select('*')
                .eq('id', router.query.clientId)
                .single();
            if (error || !clientData) {
                console.error('Error fetching client:', error);
                return;
            }
            setClient(clientData);
            // Get AI analysis of the session
            try {
                const response = await fetch('/api/analyze-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: router.query.messages,
                        client: clientData,
                        sessionStartTime: router.query.sessionStartTime
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    setEvaluation(data.evaluation);
                    setAiAnalysis(data.analysis);
                }
            }
            catch (error) {
                console.error('Error analyzing session:', error);
            }
            setIsLoading(false);
        };
        loadSessionData();
    }, [router.query, router.push]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch messages
                const messagesResponse = await fetch(`/api/sessions/${router.query.sessionId}/messages`);
                if (!messagesResponse.ok) throw new Error('Failed to fetch messages');
                const messagesData = await messagesResponse.json();
                setMessages(messagesData);

                // Fetch progress metrics
                const progressService = new ProgressTrackingService();
                const metrics = await progressService.trackProgress(router.query.clientId, router.query.sessionId);
                setProgressMetrics(metrics);

                // Fetch treatment alignment
                const alignment = await progressService.checkTreatmentAlignment(router.query.clientId, router.query.sessionId);
                setTreatmentAlignment(alignment);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch data'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router.query.clientId, router.query.sessionId]);

    const calculateOverallScore = () => {
        let total = 0;
        let count = 0;
        evaluation.forEach((category: any) => {
            category.criteria.forEach((criterion: any) => {
                total += criterion.score;
                count++;
            });
        });
        return Math.round((total / (count * 5)) * 100);
    };
    const getScoreColor = (score: number) => {
        if (score >= 4)
            return 'text-green-600';
        if (score >= 3)
            return 'text-yellow-600';
        return 'text-red-600';
    };

    const analyzeSession = async () => {
        setGenerating(true);
        setError(null);

        try {
            const response = await fetch(`/api/sessions/${router.query.sessionId}/analyze`, {
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

    if (isLoading || !client) {
        return (<div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Analyzing session...</p>
        </div>
      </div>);
    }
    return (<div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Session Evaluation</h1>
          <p className="text-gray-600">
            Session with {client.name} on{' '}
            {new Date(sessionData?.sessionStartTime || '').toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="text-2xl font-bold">{calculateOverallScore()}%</span>
            <span className="text-gray-600 ml-2">Overall Score</span>
          </div>
          <Progress value={calculateOverallScore()} className="w-40"></Progress>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="evaluation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="evaluation">
              <div className="space-y-6">
                {evaluation.map((category: any, idx: any) => (<Card key={idx} className="p-6">
                    <h3 className="text-xl font-semibold mb-4">{category.category}</h3>
                    <div className="space-y-4">
                      {category.criteria.map((criterion: any, cIdx: any) => (<div key={cIdx} className="border-b pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{criterion.name}</h4>
                              <p className="text-sm text-gray-600">{criterion.description}</p>
                            </div>
                            <span className={`font-bold ${getScoreColor(criterion.score)}`}>
                              {criterion.score}/5
                            </span>
                          </div>
                          <p className="text-sm mt-2">{criterion.feedback}</p>
                        </div>))}
                    </div>
                  </Card>))}
              </div>
            </TabsContent>

            <TabsContent value="transcript">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Session Transcript</h3>
                <div className="space-y-4">
                  {sessionData?.messages.map((message: any, idx: any) => (<div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'}`}>
                        <p className="text-sm font-medium mb-1">
                          {message.role === 'user' ? 'Therapist' : client.name}
                        </p>
                        <p>{message.content}</p>
                      </div>
                    </div>))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="analysis">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">AI Analysis</h3>
                <div className="prose max-w-none">
                  {aiAnalysis.split('\n').map((paragraph: any, idx: any) => (<p key={idx}>{paragraph}</p>))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Session Analysis */}
          <Card className="p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Session Analysis</h3>
            {analysis ? (
              <>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Summary</h4>
                  <p className="text-gray-700">{analysis.summary}</p>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Key Metrics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Effectiveness</p>
                      <p className="text-2xl font-bold">
                        {analysis.metrics.effectiveness}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Engagement</p>
                      <p className="text-2xl font-bold">
                        {analysis.metrics.engagement}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Progress</p>
                      <p className="text-2xl font-bold">
                        {analysis.metrics.progress}/10
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Patterns Identified</h4>
                  <div className="space-y-2">
                    {Object.entries(analysis.patterns.emotional).map(
                      ([emotion, count]: any) => (
                        <div key={emotion} className="flex justify-between items-center">
                          <span className="text-sm">{emotion}</span>
                          <Badge variant="outline">{count} occurrences</Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Button
                  onClick={analyzeSession}
                  disabled={generating}
                  className="w-full max-w-xs"
                >
                  {generating ? 'Analyzing...' : 'Analyze Session'}
                </Button>
              </div>
            )}
          </Card>

          {/* Progress Visualization */}
          {progressMetrics && (
            <ProgressVisualization
              progressMetrics={progressMetrics}
              treatmentAlignment={treatmentAlignment}
            />
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Client Profile</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-gray-600">{client.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Primary Issue</p>
                <p className="text-gray-600">{client.primary_issue}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Key Traits</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {client.key_traits.map((trait: string, idx: number) => (
                    <Badge key={idx} variant="outline">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Session Summary</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-gray-600">
                  {Math.round(sessionData?.duration || 0)} minutes
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Interactions</p>
                <p className="text-gray-600">{messages.length} messages</p>
              </div>
              {analysis && (
                <div>
                  <p className="text-sm font-medium">Key Moments</p>
                  <div className="space-y-2 mt-1">
                    {analysis.keyMoments.map((moment: string, idx: number) => (
                      <p key={idx} className="text-gray-600">
                        • {moment}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Button className="w-full" onClick={() => router.push('/clients')}>
            Start New Session
          </Button>
        </div>
      </div>
    </div>);
};
export default EvaluationPage;
