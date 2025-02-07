import React, { useState, useEffect } from 'react';
import { Card } from "@/../ui/card";
import { Button } from "@/../ui/button";
import { Progress } from "@/../ui/progress";
import { Badge } from "@/../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/../ui/tabs";
import { MdWarning as AlertTriangle, MdSecurity as Shield, MdFavorite as Heart, MdPsychology as Brain, MdLightbulb as Lightbulb, MdVerified as UserCheck, MdVolunteerActivism as HandHeart, MdAccessTime as Clock } from 'react-icons/md';
import { AnalyticsService } from "@/../../services/analytics";
import { AIAnalyticsService } from "@/../../services/aiAnalytics";
interface SafetyProtocol {
    type: 'grounding' | 'containment' | 'regulation' | 'support';
    name: string;
    description: string;
    steps: string[];
    indicators: string[];
}
interface CaseScenario {
    id: string;
    title: string;
    background: string;
    triggers: string[];
    safetyProtocols: SafetyProtocol[];
    interventionOptions: Array<{
        id: string;
        action: string;
        rationale: string;
        impact: {
            trust: number;
            safety: number;
            empowerment: number;
        };
        considerations: string[];
    }>;
}
interface ClientState {
    trust: number;
    safety: number;
    empowerment: number;
    regulation: number;
}
interface TraumaInformedTutorialProps {
    userId: string;
    scenarioId: string;
    onComplete: (results: any) => void;
}
export const TraumaInformedTutorial: React.FC = ({ userId, scenarioId, onComplete }) => {
    const [scenario, setScenario] = useState<CaseScenario | null>(null);
    const [clientState, setClientState] = useState<ClientState>({
        trust: 40,
        safety: 50,
        empowerment: 30,
        regulation: 45
    });
    const [currentProtocol, setCurrentProtocol] = useState<SafetyProtocol | null>(null);
    const [activeInterventions, setActiveInterventions] = useState<string[]>([]);
    const [notes, setNotes] = useState<Array<{
        timestamp: number;
        note: string;
        category: string;
    }>>([]);
    const [feedback, setFeedback] = useState<Array<{
        type: 'success' | 'warning' | 'info';
        message: string;
    }>>([]);
    useEffect(() => {
        const fetchScenario = async () => {
            try {
                const response = await fetch(`/api/trauma-scenarios/${scenarioId}`);
                if (response.ok) {
                    const data = await response.json();
                    setScenario(data);
                }
            }
            catch (error) {
                console.error('Error fetching trauma scenario:', error);
            }
        };
        fetchScenario();
    }, [scenarioId]);
    useEffect(() => {
        if (!scenario)
            return;
        const analyzeState = async () => {
            try {
                const adaptiveFeedback = await AIAnalyticsService.generateAdaptiveFeedback(userId, {
                    clientState,
                    activeInterventions,
                    scenario
                });
                setFeedback(prev => [
                    ...prev,
                    {
                        type: adaptiveFeedback.confidenceLevel > 0.7 ? 'success' : 'info',
                        message: adaptiveFeedback.feedback
                    }
                ]);
            }
            catch (error) {
                console.error('Error generating adaptive feedback:', error);
            }
        };
        analyzeState();
    }, [clientState, activeInterventions]);
    const implementSafetyProtocol = (protocol: SafetyProtocol) => {
        setCurrentProtocol(protocol);
        updateClientState({
            safety: 10,
            regulation: 5,
            trust: protocol.type === 'support' ? 15 : 5,
            empowerment: protocol.type === 'grounding' ? 10 : 5
        });
        AnalyticsService.trackResourceEngagement(userId, scenarioId, 'safety_protocol', {
            protocolType: protocol.type,
            clientState
        });
    };
    const applyIntervention = (intervention: any) => {
        setActiveInterventions(prev => [...prev, intervention.id]);
        updateClientState(intervention.impact);
        setNotes(prev => [
            ...prev,
            {
                timestamp: Date.now(),
                note: `Applied intervention: ${intervention.action}`,
                category: 'intervention'
            }
        ]);
        AnalyticsService.trackResourceEngagement(userId, scenarioId, 'intervention', {
            interventionId: intervention.id,
            impact: intervention.impact
        });
    };
    const updateClientState = (changes: Partial<ClientState>) => {
        setClientState(prev => {
            const newState = { ...prev };
            Object.entries(changes).forEach(([key, value]) => {
                if (key in newState) {
                    newState[key as keyof ClientState] = Math.min(100, Math.max(0, newState[key as keyof ClientState] + (value as number)));
                }
            });
            return newState;
        });
    };
    const addNote = (note: string, category: string) => {
        setNotes(prev => [
            ...prev,
            {
                timestamp: Date.now(),
                note,
                category
            }
        ]);
    };
    const handleComplete = async () => {
        const results = {
            scenarioId,
            userId,
            finalClientState: clientState,
            interventionsApplied: activeInterventions,
            notes,
            completedAt: new Date()
        };
        try {
            const skillAnalysis = await AIAnalyticsService.analyzeCognitiveDevelopment(userId, results);
            // Track completion in analytics
            AnalyticsService.trackTutorialProgress(userId, scenarioId, 100);
            onComplete({
                ...results,
                skillAnalysis
            });
        }
        catch (error) {
            console.error('Error analyzing results:', error);
            onComplete(results);
        }
    };
    if (!scenario) {
        return <div>Loading scenario...</div>;
    }
    return (<div className="max-w-6xl mx-auto space-y-8">
      {/* Scenario Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{scenario.title}</h2>
            <p className="text-gray-400">{scenario.background}</p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary"></Shield>
            <span className="text-sm">Trauma-Informed Approach</span>
          </div>
        </div>

        {/* Trigger Warnings */}
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Content Warnings</h3>
          <div className="flex flex-wrap gap-2">
            {scenario.triggers.map((trigger, index) => (<Badge key={index} variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1"></AlertTriangle>
                {trigger}
              </Badge>))}
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Client State */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Client State</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Trust</span>
                <span className="text-sm text-gray-400">{clientState.trust}%</span>
              </div>
              <Progress value={clientState.trust} className="h-2"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Safety</span>
                <span className="text-sm text-gray-400">{clientState.safety}%</span>
              </div>
              <Progress value={clientState.safety} className="h-2"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Empowerment</span>
                <span className="text-sm text-gray-400">
                  {clientState.empowerment}%
                </span>
              </div>
              <Progress value={clientState.empowerment} className="h-2"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Regulation</span>
                <span className="text-sm text-gray-400">
                  {clientState.regulation}%
                </span>
              </div>
              <Progress value={clientState.regulation} className="h-2"></Progress>
            </div>
          </div>
        </Card>

        {/* Safety Protocols */}
        <Card className="col-span-2 p-6">
          <Tabs defaultValue="protocols">
            <TabsList>
              <TabsTrigger value="protocols">Safety Protocols</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="protocols" className="space-y-4">
              {scenario.safetyProtocols.map(protocol => (<div key={protocol.name} className="p-4 border rounded-lg hover:bg-primary/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{protocol.name}</h4>
                    <Badge variant="outline">{protocol.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {protocol.description}
                  </p>
                  <Button variant="outline" onClick={() => implementSafetyProtocol(protocol)}>
                    Implement Protocol
                  </Button>
                </div>))}
            </TabsContent>

            <TabsContent value="interventions" className="space-y-4">
              {scenario.interventionOptions.map(intervention => (<div key={intervention.id} className="p-4 border rounded-lg hover:bg-primary/5">
                  <div className="mb-2">
                    <h4 className="font-medium">{intervention.action}</h4>
                    <p className="text-sm text-gray-400">{intervention.rationale}</p>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4"></Heart>
                      <span className="text-sm">+{intervention.impact.trust}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-4 h-4"></Shield>
                      <span className="text-sm">+{intervention.impact.safety}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Brain className="w-4 h-4"></Brain>
                      <span className="text-sm">
                        +{intervention.impact.empowerment}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => applyIntervention(intervention)} disabled={activeInterventions.includes(intervention.id)}>
                    Apply Intervention
                  </Button>
                </div>))}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-2">
                {notes.map((note, index) => (<div key={index} className="p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{note.category}</Badge>
                      <span className="text-sm text-gray-400">
                        {new Date(note.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{note.note}</p>
                  </div>))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Feedback Area */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Clinical Feedback</h3>
        <div className="space-y-3">
          {feedback.map((item, index) => (<div key={index} className={`p-4 rounded-lg ${item.type === 'success'
                ? 'bg-green-500/10'
                : item.type === 'warning'
                    ? 'bg-yellow-500/10'
                    : 'bg-blue-500/10'}`}>
              <div className="flex items-center gap-2">
                {item.type === 'success' ? (<UserCheck className="w-5 h-5 text-green-500"></UserCheck>) : item.type === 'warning' ? (<AlertTriangle className="w-5 h-5 text-yellow-500"></AlertTriangle>) : (<Lightbulb className="w-5 h-5 text-blue-500"></Lightbulb>)}
                <p>{item.message}</p>
              </div>
            </div>))}
        </div>
      </Card>

      {/* Complete Button */}
      <Button className="w-full" onClick={handleComplete} disabled={activeInterventions.length === 0}>
        Complete Scenario
      </Button>
    </div>);
};
export default TraumaInformedTutorial;
