import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { AnalyticsService } from "@/services/analytics";
import type { CrisisInterventionTutorialProps } from "@/types";

interface RiskFactor {
    type: string;
    level: number;
    description: string;
    indicators: string[];
}
interface VitalSign {
    type: string;
    value: number;
    unit: string;
    normalRange: {
        min: number;
        max: number;
    };
}
interface SafetyAssessment {
    timestamp: number;
    risks: RiskFactor[];
    vitalSigns: VitalSign[];
    mentalStatus: {
        orientation: number;
        mood: string;
        affect: string;
        thoughtProcess: string;
    };
}
interface InterventionOption {
    id: string;
    text: string;
    type: 'immediate' | 'assessment' | 'deescalation' | 'support';
    impact: {
        clientState: Partial<ClientState>;
        riskLevels: Partial<Record<string, number>>;
    };
    timeRequired: number;
    requiresAssistance: boolean;
    feedback: string;
    score: number;
}
interface ClientState {
    agitation: number;
    cooperation: number;
    stability: number;
    safety: number;
}
interface CrisisScenario {
    id: string;
    title: string;
    description: string;
    initialAssessment: SafetyAssessment;
    clientBackground: string;
    triggerEvents: string[];
    availableResources: string[];
    interventionOptions: InterventionOption[];
    timeLimit: number;
    escalationPoints: Array<{
        timestamp: number;
        description: string;
        criticalDecision: boolean;
    }>;
}

export const CrisisInterventionTutorial: React.FC = ({ userId, scenarioId, onComplete }) => {
    const [scenario, setScenario] = useState<CrisisScenario | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [clientState, setClientState] = useState<ClientState>({
        agitation: 70,
        cooperation: 40,
        stability: 50,
        safety: 60
    });
    const [currentAssessment, setCurrentAssessment] = useState<SafetyAssessment | null>(null);
    const [interventions, setInterventions] = useState<Array<{
        timestamp: number;
        intervention: InterventionOption;
        outcome: string;
    }>>([]);
    const [activeResources, setActiveResources] = useState<string[]>([]);
    const [criticalPoints, setCriticalPoints] = useState<Array<{
        timestamp: number;
        handled: boolean;
    }>>([]);
    const [isEmergency, setIsEmergency] = useState<boolean>(false);
    useEffect(() => {
        const fetchScenario = async () => {
            try {
                const response = await fetch(`/api/crisis-scenarios/${scenarioId}`);
                if (response.ok) {
                    const data = await response.json();
                    setScenario(data);
                    setCurrentAssessment(data.initialAssessment);
                }
            }
            catch (error) {
                console.error('Error fetching crisis scenario:', error);
            }
        };
        fetchScenario();
    }, [scenarioId]);
    useEffect(() => {
        if (!scenario || isEmergency)
            return;
        const timer = setInterval(() => {
            if (currentTime < scenario.timeLimit) {
                setCurrentTime(prev => prev + 1);
                updateClientState();
                checkEscalationPoints();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [scenario, currentTime, isEmergency]);
    const updateClientState = () => {
        if (!scenario)
            return;
        // Natural progression of client state
        setClientState(prev => ({
            ...prev,
            agitation: Math.min(100, prev.agitation + (prev.stability < 40 ? 2 : -1)),
            stability: Math.max(0, prev.stability + (activeResources.includes('medical') ? 1 : -1)),
            safety: calculateSafetyScore(prev)
        }));
        // Update assessment if needed
        if (currentTime % 30 === 0) {
            // Update every 30 seconds
            updateAssessment();
        }
    };
    const calculateSafetyScore = (state: ClientState): number => {
        return Math.round((state.cooperation * 0.3 +
            state.stability * 0.4 +
            (100 - state.agitation) * 0.3) *
            (activeResources.length * 0.1 + 1));
    };
    const updateAssessment = () => {
        if (!currentAssessment)
            return;
        const newVitals = currentAssessment.vitalSigns.map((vital: any) => ({
            ...vital,
            value: adjustVitalSign(vital, clientState.stability)
        }));
        setCurrentAssessment(prev => ({
            ...prev!,
            timestamp: currentTime,
            vitalSigns: newVitals,
            mentalStatus: {
                ...prev!.mentalStatus,
                mood: clientState.agitation > 70 ? 'Agitated' : 'Anxious',
                affect: clientState.stability < 40 ? 'Labile' : 'Restricted'
            }
        }));
    };
    const adjustVitalSign = (vital: VitalSign, stability: number): number => {
        const range = vital.normalRange.max - vital.normalRange.min;
        const deviation = (100 - stability) / 100 * (range * 0.3);
        return Math.max(vital.normalRange.min, Math.min(vital.normalRange.max, vital.value + (Math.random() * 2 - 1) * deviation));
    };
    const checkEscalationPoints = () => {
        if (!scenario)
            return;
        const escalation = scenario.escalationPoints.find(point => point.timestamp === currentTime &&
            !criticalPoints.find(cp => cp.timestamp === point.timestamp)?.handled);
        if (escalation) {
            if (escalation.criticalDecision) {
                setIsEmergency(true);
            }
            setCriticalPoints(prev => [
                ...prev,
                { timestamp: currentTime, handled: false }
            ]);
        }
    };
    const handleIntervention = (option: InterventionOption) => {
        // Apply intervention effects
        setClientState(prev => ({
            ...prev,
            ...option.impact.clientState
        }));
        // Update active resources
        if (option.requiresAssistance) {
            setActiveResources(prev => [...prev, option.type]);
        }
        // Record intervention
        setInterventions(prev => [
            ...prev,
            {
                timestamp: currentTime,
                intervention: option,
                outcome: option.feedback
            }
        ]);
        // Mark critical point as handled if applicable
        setCriticalPoints(prev => prev.map((point: any) => point.timestamp === currentTime ? { ...point, handled: true } : point));
        // Track in analytics
        AnalyticsService.trackResourceEngagement(userId, scenarioId, 'crisis_intervention', {
            interventionType: option.type,
            timestamp: currentTime,
            score: option.score
        });
        if (isEmergency) {
            setIsEmergency(false);
        }
    };
    const handleComplete = () => {
        const results = {
            scenarioId,
            userId,
            duration: currentTime,
            finalClientState: clientState,
            interventions,
            criticalPointsHandled: criticalPoints.filter((point: any) => point.handled).length,
            resourcesUtilized: activeResources,
            safetyScore: clientState.safety,
            completedAt: new Date()
        };
        // Track completion in analytics
        AnalyticsService.trackTutorialProgress(userId, scenarioId, 100);
        onComplete(results);
    };
    if (!scenario || !currentAssessment) {
        return <div>Loading scenario...</div>;
    }
    return (<div className="max-w-6xl mx-auto space-y-8">
      {/* Emergency Alert */}
      {isEmergency && (<Alert variant="destructive">
          <AlertTriangle className="h-4 w-4"></AlertTriangle>
          <AlertTitle>Critical Situation</AlertTitle>
          <AlertDescription>
            Immediate intervention required. Choose your next action carefully.
          </AlertDescription>
        </Alert>)}

      {/* Scenario Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{scenario.title}</h2>
            <p className="text-gray-400">{scenario.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Time Remaining</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Timer className="w-5 h-5"></Timer>
              {Math.floor((scenario.timeLimit - currentTime) / 60)}:
              {((scenario.timeLimit - currentTime) % 60)
            .toString()
            .padStart(2, '0')}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Client Status */}
        <Card className="col-span-2 p-6">
          <h3 className="text-xl font-semibold mb-4">Client Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Agitation</span>
                <span className="text-sm text-gray-400">{clientState.agitation}%</span>
              </div>
              <Progress value={clientState.agitation} className="h-2" indicatorClassName="bg-red-500"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Cooperation</span>
                <span className="text-sm text-gray-400">
                  {clientState.cooperation}%
                </span>
              </div>
              <Progress value={clientState.cooperation} className="h-2" indicatorClassName="bg-blue-500"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Stability</span>
                <span className="text-sm text-gray-400">{clientState.stability}%</span>
              </div>
              <Progress value={clientState.stability} className="h-2" indicatorClassName="bg-green-500"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Safety</span>
                <span className="text-sm text-gray-400">{clientState.safety}%</span>
              </div>
              <Progress value={clientState.safety} className="h-2" indicatorClassName="bg-yellow-500"></Progress>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Vital Signs</h4>
            <div className="grid grid-cols-2 gap-4">
              {currentAssessment.vitalSigns.map((vital: any) => (<div key={vital.type} className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-gray-400"></Activity>
                  <div>
                    <div className="text-sm">{vital.type}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {vital.value.toFixed(1)} {vital.unit}
                      </span>
                      {vital.value < vital.normalRange.min ||
                vital.value > vital.normalRange.max ? (<AlertCircle className="w-4 h-4 text-red-500"></AlertCircle>) : (<CheckCircle className="w-4 h-4 text-green-500"></CheckCircle>)}
                    </div>
                  </div>
                </div>))}
            </div>
          </div>
        </Card>

        {/* Active Resources */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Active Resources</h3>
          <div className="space-y-2">
            {scenario.availableResources.map((resource: any) => (<div key={resource} className={`p-3 rounded-lg flex items-center justify-between ${activeResources.includes(resource)
                ? 'bg-primary/20'
                : 'bg-gray-800'}`}>
                <span>{resource}</span>
                {activeResources.includes(resource) ? (<CheckCircle className="w-4 h-4 text-primary"></CheckCircle>) : (<XCircle className="w-4 h-4 text-gray-400"></XCircle>)}
              </div>))}
          </div>
        </Card>
      </div>

      {/* Intervention Options */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Available Interventions</h3>
        <div className="grid grid-cols-2 gap-4">
          {scenario.interventionOptions
            .filter((option: any) => !option.requiresAssistance || activeResources.includes(option.type))
            .map((option: any) => (<Button key={option.id} variant={option.type === 'immediate' ? 'default' : 'outline'} className="w-full text-left justify-start" onClick={() => handleIntervention(option)}>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{option.type}</Badge>
                    <span>{option.text}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Time required: {option.timeRequired}s
                  </div>
                </div>
              </Button>))}
        </div>
      </Card>

      {/* Intervention History */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Intervention History</h3>
        <div className="space-y-3">
          {interventions.map((intervention: any, index: any) => (<div key={index} className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{intervention.intervention.type}</Badge>
                <span className="text-sm text-gray-400">
                  {Math.floor(intervention.timestamp / 60)}:
                  {(intervention.timestamp % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <p className="mb-1">{intervention.intervention.text}</p>
              <p className="text-sm text-gray-400">{intervention.outcome}</p>
            </div>))}
        </div>
      </Card>

      {/* Complete Button */}
      <Button className="w-full" onClick={handleComplete} disabled={currentTime < scenario.timeLimit || isEmergency}>
        Complete Scenario
      </Button>
    </div>);
};
export default CrisisInterventionTutorial;
