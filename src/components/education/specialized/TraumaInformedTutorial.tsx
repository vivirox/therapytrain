// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card } from '@/ui/card';
import { Button } from '@/ui/button';
import { Progress } from '@/ui/progress';
import { Badge } from '@/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MdWarning as AlertTriangle, MdSecurity as Shield, MdFavorite as Heart, MdPsychology as Brain, MdLightbulb as Lightbulb, MdVerified as UserCheck, MdVolunteerActivism as HandHeart, MdAccessTime as Clock } from 'react-icons/md';
import { AnalyticsService } from '@/services/analytics';
import { aiAnalyticsService } from '@/services/aiAnalytics';

interface Protocol {
    type: 'support' | 'grounding' | 'containment' | 'regulation';
    title: string;
    description: string;
    steps: string[];
}

interface Intervention {
    id: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
}

interface ClientState {
    anxiety: number;
    dissociation: number;
    emotional_regulation: number;
}

interface TraumaInformedTutorialProps {
    userId: string;
    scenarioId: string;
    onComplete: () => void;
    className?: string;
}

export const TraumaInformedTutorial: React.FC<TraumaInformedTutorialProps> = ({
    userId,
    scenarioId,
    onComplete
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [clientState, setClientState] = useState<ClientState>({
        anxiety: 70,
        dissociation: 50,
        emotional_regulation: 30
    });
    const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
    const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
    const [progress, setProgress] = useState(0);

    const protocols: Protocol[] = [
        {
            type: 'grounding',
            title: '5-4-3-2-1 Grounding Exercise',
            description: 'A sensory awareness exercise to help the client stay present',
            steps: [
                'Name 5 things you can see',
                'Name 4 things you can touch',
                'Name 3 things you can hear',
                'Name 2 things you can smell',
                'Name 1 thing you can taste'
            ]
        },
        {
            type: 'containment',
            title: 'Safe Container Visualization',
            description: 'Guided imagery to create a mental safe space',
            steps: [
                'Imagine a container that feels safe',
                'Visualize its details',
                'Practice opening and closing it',
                'Place difficult emotions inside',
                'Close it until ready to process'
            ]
        },
        {
            type: 'regulation',
            title: 'Window of Tolerance Work',
            description: 'Understanding and expanding emotional capacity',
            steps: [
                'Identify current emotional state',
                'Recognize personal triggers',
                'Practice self-regulation techniques',
                'Expand comfort zone gradually',
                'Develop coping strategies'
            ]
        }
    ];

    const interventions: Intervention[] = [
        {
            id: 'psy-ed',
            title: 'Psychoeducation',
            description: 'Explain trauma responses and normalize reactions',
            impact: 'medium'
        },
        {
            id: 'somatic',
            title: 'Somatic Awareness',
            description: 'Body-based techniques for trauma processing',
            impact: 'high'
        },
        {
            id: 'resource',
            title: 'Resource Building',
            description: 'Developing internal and external support systems',
            impact: 'medium'
        }
    ];

    useEffect(() => {
        setProgress((currentStep / 3) * 100); // 3 main steps in the tutorial
    }, [currentStep]);

    const handleProtocolSelection = (protocol: Protocol) => {
        setSelectedProtocol(protocol);
        
        // Track protocol selection in analytics
        AnalyticsService.trackEvent({
            type: 'protocol_selection',
            userId,
            timestamp: Date.now(),
            data: {
                scenarioId,
                protocolType: protocol.type,
                clientState
            }
        });

        // Simulate client state changes based on protocol
        updateClientState(protocol);
    };

    const handleInterventionSelection = (intervention: Intervention) => {
        setSelectedIntervention(intervention);
        
        // Track intervention selection in analytics
        AnalyticsService.trackEvent({
            type: 'intervention_selection',
            userId,
            timestamp: Date.now(),
            data: {
                scenarioId,
                interventionId: intervention.id,
                impact: intervention.impact
            }
        });

        // Move to next step
        setCurrentStep(prev => prev + 1);
    };

    const updateClientState = (protocol: Protocol) => {
        setClientState(prev => {
            const newState = { ...prev };
            
            switch (protocol.type) {
                case 'grounding':
                    newState.dissociation = Math.max(0, prev.dissociation - 20);
                    newState.anxiety = Math.max(0, prev.anxiety - 10);
                    break;
                case 'containment':
                    newState.anxiety = Math.max(0, prev.anxiety - 20);
                    newState.emotional_regulation = Math.min(100, prev.emotional_regulation + 15);
                    break;
                case 'regulation':
                    newState.emotional_regulation = Math.min(100, prev.emotional_regulation + 25);
                    newState.anxiety = Math.max(0, prev.anxiety - 15);
                    break;
                case 'support':
                    newState.anxiety = Math.max(0, prev.anxiety - 15);
                    newState.emotional_regulation = Math.min(100, prev.emotional_regulation + 10);
                    break;
            }
            
            return newState;
        });
    };

    const handleComplete = () => {
        // Track completion in analytics
        AnalyticsService.trackEvent({
            type: 'tutorial_complete',
            userId,
            timestamp: Date.now(),
            data: {
                scenarioId,
                finalClientState: clientState,
                selectedProtocol: selectedProtocol?.type,
                selectedIntervention: selectedIntervention?.id
            }
        });

        onComplete();
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Progress value={progress} className="mb-6" />

            <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Trauma-Informed Care Tutorial</h2>
                <p className="text-gray-600 mb-6">
                    Learn to apply trauma-informed principles in therapeutic settings.
                </p>

                {currentStep === 0 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Client Assessment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-600">Anxiety Level</label>
                                <Progress value={clientState.anxiety} className="h-2" />
                                <span className="text-sm text-gray-600">{clientState.anxiety}%</span>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Dissociation Level</label>
                                <Progress value={clientState.dissociation} className="h-2" />
                                <span className="text-sm text-gray-600">{clientState.dissociation}%</span>
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Emotional Regulation</label>
                                <Progress value={clientState.emotional_regulation} className="h-2" />
                                <span className="text-sm text-gray-600">{clientState.emotional_regulation}%</span>
                            </div>
                        </div>
                        <Button onClick={() => setCurrentStep(1)}>Continue to Protocol Selection</Button>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Select Safety Protocol</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {protocols.map((protocol: any) => (
                                <Card
                                    key={protocol.type}
                                    className={`p-4 cursor-pointer transition-all ${
                                        selectedProtocol?.type === protocol.type
                                            ? 'border-primary'
                                            : 'hover:border-gray-300'
                                    }`}
                                    onClick={() => handleProtocolSelection(protocol)}
                                >
                                    <h4 className="font-semibold mb-2">{protocol.title}</h4>
                                    <p className="text-sm text-gray-600">{protocol.description}</p>
                                </Card>
                            ))}
                        </div>
                        {selectedProtocol && (
                            <Button onClick={() => setCurrentStep(2)}>Continue to Intervention</Button>
                        )}
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Select Therapeutic Intervention</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {interventions.map((intervention: any) => (
                                <Card
                                    key={intervention.id}
                                    className={`p-4 cursor-pointer transition-all ${
                                        selectedIntervention?.id === intervention.id
                                            ? 'border-primary'
                                            : 'hover:border-gray-300'
                                    }`}
                                    onClick={() => handleInterventionSelection(intervention)}
                                >
                                    <h4 className="font-semibold mb-2">{intervention.title}</h4>
                                    <p className="text-sm text-gray-600">{intervention.description}</p>
                                    <Badge
                                        variant={
                                            intervention.impact === 'high'
                                                ? 'default'
                                                : intervention.impact === 'medium'
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                        className="mt-2"
                                    >
                                        {intervention.impact} impact
                                    </Badge>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Tutorial Complete</h3>
                        <div className="space-y-4">
                            <p>You've completed the trauma-informed care tutorial. Here's a summary:</p>
                            <div className="space-y-2">
                                <p>
                                    <strong>Selected Protocol:</strong> {selectedProtocol?.title}
                                </p>
                                <p>
                                    <strong>Selected Intervention:</strong> {selectedIntervention?.title}
                                </p>
                                <p>
                                    <strong>Final Client State:</strong>
                                </p>
                                <div className="pl-4 space-y-2">
                                    <p>Anxiety: {clientState.anxiety}%</p>
                                    <p>Dissociation: {clientState.dissociation}%</p>
                                    <p>Emotional Regulation: {clientState.emotional_regulation}%</p>
                                </div>
                            </div>
                            <Button onClick={handleComplete}>Complete Tutorial</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TraumaInformedTutorial;
