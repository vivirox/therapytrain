import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientProfile } from '@/types/ClientProfile';
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
const EvaluationPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [evaluation, setEvaluation] = useState<EvaluationCriteria[]>(evaluationCriteria);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    useEffect(() => {
        const loadSessionData = async () => {
            if (!location.state) {
                navigate('/clients');
                return;
            }
            setSessionData(location.state as SessionData);
            // Fetch client data
            const { data: clientData, error } = await supabase
                .from('client_profiles')
                .select('*')
                .eq('id', location.state.clientId)
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
                        messages: location.state.messages,
                        client: clientData,
                        sessionStartTime: location.state.sessionStartTime
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
    }, [location.state, navigate]);
    const calculateOverallScore = () => {
        let total = 0;
        let count = 0;
        evaluation.forEach(category => {
            category.criteria.forEach(criterion => {
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
                {evaluation.map((category, idx) => (<Card key={idx} className="p-6">
                    <h3 className="text-xl font-semibold mb-4">{category.category}</h3>
                    <div className="space-y-4">
                      {category.criteria.map((criterion, cIdx) => (<div key={cIdx} className="border-b pb-4">
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
                  {sessionData?.messages.map((message, idx) => (<div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                  {aiAnalysis.split('\n').map((paragraph, idx) => (<p key={idx}>{paragraph}</p>))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
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
                  {client.key_traits.map((trait: unknown, idx: unknown) => (<Badge key={idx} variant="outline">
                      {trait}
                    </Badge>))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Session Summary</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-gray-600">10 minutes</p>
              </div>
              <div>
                <p className="text-sm font-medium">Interactions</p>
                <p className="text-gray-600">{sessionData?.messages.length || 0} messages</p>
              </div>
              <div>
                <p className="text-sm font-medium">Key Moments</p>
                <div className="space-y-2 mt-1">
                  {/* Add key moments from AI analysis */}
                </div>
              </div>
            </div>
          </Card>

          <Button className="w-full" onClick={() => navigate('/clients')}>
            Start New Session
          </Button>
        </div>
      </div>
    </div>);
};
export default EvaluationPage;
