import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Download, FileText, BarChart2, MessageCircle, Brain } from 'lucide-react';
import { therapeuticApproaches, calculateWeightedScore, generateFeedback } from "./models/rubrics";
interface SessionData {
    id: string;
    startTime: Date;
    endTime: Date;
    clientId: string;
    therapistId: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
        analysis?: {
            patterns: string[];
            defenses: string[];
            emotions: string[];
            intensity: number;
        };
    }>;
    interventions: Array<{
        type: string;
        timestamp: Date;
        content: string;
        effectiveness: number;
        approach: string;
    }>;
}
interface SessionAnalysisProps {
    sessionId: string;
    onGenerateReport: (report: any) => void;
    className?: string;
}
const SessionAnalysis: React.FC = ({ sessionId, onGenerateReport }) => {
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [analysis, setAnalysis] = useState<{
        scores: Record<string, number>;
        patterns: Record<string, number>;
        emotions: Record<string, {
            count: number;
            avgIntensity: number;
        }>;
        defenses: Record<string, number>;
        interventionEffectiveness: Record<string, number>;
    } | null>(null);
    useEffect(() => {
        const loadSessionData = async () => {
            try {
                const response = await fetch(`/api/sessions/${sessionId}`);
                if (response.ok) {
                    const data = await response.json();
                    setSessionData(data);
                    analyzeSession(data);
                }
            }
            catch (error) {
                console.error('Error loading session data:', error);
            }
        };
        loadSessionData();
    }, [sessionId]);
    const analyzeSession = (data: SessionData) => {
        const analysis = {
            scores: {} as Record<string, number>,
            patterns: {} as Record<string, number>,
            emotions: {} as Record<string, {
                count: number;
                avgIntensity: number;
            }>,
            defenses: {} as Record<string, number>,
            interventionEffectiveness: {} as Record<string, number>
        };
        // Analyze therapeutic patterns
        data.messages.forEach(msg => {
            if (msg.analysis) {
                // Track patterns
                msg.analysis.patterns.forEach(pattern => {
                    analysis.patterns[pattern] = (analysis.patterns[pattern] || 0) + 1;
                });
                // Track emotions
                msg.analysis.emotions.forEach(emotion => {
                    if (!analysis.emotions[emotion]) {
                        analysis.emotions[emotion] = { count: 0, avgIntensity: 0 };
                    }
                    analysis.emotions[emotion].count++;
                    analysis.emotions[emotion].avgIntensity =
                        (analysis.emotions[emotion].avgIntensity * (analysis.emotions[emotion].count - 1) +
                            msg.analysis!.intensity) / analysis.emotions[emotion].count;
                });
                // Track defenses
                msg.analysis.defenses.forEach(defense => {
                    analysis.defenses[defense] = (analysis.defenses[defense] || 0) + 1;
                });
            }
        });
        // Calculate intervention effectiveness
        data.interventions.forEach(intervention => {
            if (!analysis.interventionEffectiveness[intervention.approach]) {
                analysis.interventionEffectiveness[intervention.approach] = 0;
            }
            analysis.interventionEffectiveness[intervention.approach] += intervention.effectiveness;
        });
        // Calculate average effectiveness
        Object.keys(analysis.interventionEffectiveness).forEach(approach => {
            const interventions = data.interventions.filter(i => i.approach === approach);
            if (interventions.length > 0) {
                analysis.interventionEffectiveness[approach] /= interventions.length;
            }
        });
        setAnalysis(analysis);
    };
    const generateReport = () => {
        if (!sessionData || !analysis)
            return;
        const report = {
            sessionInfo: {
                duration: new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime(),
                messageCount: sessionData.messages.length,
                interventionCount: sessionData.interventions.length
            },
            therapeuticProgress: {
                patterns: analysis.patterns,
                emotions: analysis.emotions,
                defenses: analysis.defenses
            },
            interventionEffectiveness: analysis.interventionEffectiveness,
            recommendations: generateRecommendations(analysis)
        };
        onGenerateReport(report);
    };
    const generateRecommendations = (analysis: NonNullable<typeof analysis>) => {
        const recommendations = [];
        // Analyze emotional patterns
        const dominantEmotion = Object.entries(analysis.emotions)
            .sort((a, b) => b[1].count - a[1].count)[0];
        if (dominantEmotion) {
            recommendations.push({
                category: 'Emotional Patterns',
                observation: `Dominant emotion: ${dominantEmotion[0]} (${dominantEmotion[1].count} occurrences)`,
                suggestion: `Consider focusing on ${dominantEmotion[0]} management strategies`
            });
        }
        // Analyze defense mechanisms
        const dominantDefense = Object.entries(analysis.defenses)
            .sort((a, b) => b[1] - a[1])[0];
        if (dominantDefense) {
            recommendations.push({
                category: 'Defense Mechanisms',
                observation: `Primary defense: ${dominantDefense[0]} (${dominantDefense[1]} instances)`,
                suggestion: `Work on addressing ${dominantDefense[0]} through gradual exposure`
            });
        }
        // Analyze intervention effectiveness
        const mostEffective = Object.entries(analysis.interventionEffectiveness)
            .sort((a, b) => b[1] - a[1])[0];
        if (mostEffective) {
            recommendations.push({
                category: 'Interventions',
                observation: `Most effective approach: ${mostEffective[0]} (${mostEffective[1].toFixed(1)}/5)`,
                suggestion: `Consider increasing use of ${mostEffective[0]} techniques`
            });
        }
        return recommendations;
    };
    if (!sessionData || !analysis) {
        return <div>Loading session analysis...</div>;
    }
    return (<div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Session Analysis</h2>
        <Button onClick={generateReport}>
          <Download className="h-4 w-4 mr-2"></Download>
          Generate Report
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2"></FileText>
            Overview
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <Brain className="h-4 w-4 mr-2"></Brain>
            Patterns
          </TabsTrigger>
          <TabsTrigger value="interventions">
            <BarChart2 className="h-4 w-4 mr-2"></BarChart2>
            Interventions
          </TabsTrigger>
          <TabsTrigger value="dialogue">
            <MessageCircle className="h-4 w-4 mr-2"></MessageCircle>
            Dialogue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Session Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-lg font-medium">
                  {Math.round((new Date(sessionData.endTime).getTime() -
            new Date(sessionData.startTime).getTime()) / 60000)} minutes
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interventions</p>
                <p className="text-lg font-medium">{sessionData.interventions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Messages</p>
                <p className="text-lg font-medium">{sessionData.messages.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patterns Identified</p>
                <p className="text-lg font-medium">{Object.keys(analysis.patterns).length}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Therapeutic Patterns</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium mb-2">Emotional Patterns</h4>
                <div className="space-y-2">
                  {Object.entries(analysis.emotions).map(([emotion, data]) => (<div key={emotion} className="flex justify-between items-center">
                      <span className="text-sm">{emotion}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {data.count} occurrences
                        </span>
                        <span className="text-sm text-gray-500">
                          Avg. Intensity: {data.avgIntensity.toFixed(1)}
                        </span>
                      </div>
                    </div>))}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium mb-2">Defense Mechanisms</h4>
                <div className="space-y-2">
                  {Object.entries(analysis.defenses).map(([defense, count]) => (<div key={defense} className="flex justify-between items-center">
                      <span className="text-sm">{defense}</span>
                      <span className="text-sm text-gray-500">{count} instances</span>
                    </div>))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Intervention Analysis</h3>
            <div className="space-y-4">
              {Object.entries(analysis.interventionEffectiveness).map(([approach, effectiveness]) => (<div key={approach}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{approach}</span>
                    <span className="text-sm text-gray-500">
                      Effectiveness: {effectiveness.toFixed(1)}/5
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(effectiveness / 5) * 100}%` }}/>
                  </div>
                </div>))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="dialogue">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Dialogue Analysis</h3>
            <div className="space-y-4">
              {sessionData.messages.map((message, index) => (<div key={index} className="border-b last:border-0 pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">
                      {message.role === 'user' ? 'Therapist' : 'Client'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{message.content}</p>
                  {message.analysis && (<div className="flex flex-wrap gap-2 mt-1">
                      {message.analysis.patterns.map((pattern, i) => (<Badge key={i} variant="outline" className="text-xs">
                          {pattern}
                        </Badge>))}
                    </div>)}
                </div>))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
};
export default SessionAnalysis;
