import React, { useState, useEffect } from 'react';
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { MdGroups as Users, MdMessage as MessageSquare, MdError as AlertCircle, MdCheckCircle as CheckCircle, MdHelpOutline as HelpCircle, MdPersonAdd as UserPlus, MdPersonRemove as UserMinus, MdAutoAwesome as Sparkles } from 'react-icons/md';
import { AnalyticsService } from "../services/analytics";

interface GroupMember {
    id: string;
    name: string;
    background: string;
    presentingIssues: Array<string>;
    currentMood: string;
    engagement: number;
    interactions: Array<{
        timestamp: number;
        type: string;
        target?: string;
        content: string;
    }>;
}

interface GroupDynamic {
    cohesion: number;
    tension: number;
    participation: number;
    support: number;
}

interface GroupEvent {
    id: string;
    type: 'conflict' | 'breakthrough' | 'resistance' | 'support';
    description: string;
    involvedMembers: Array<string>;
    options: Array<{
        text: string;
        impact: {
            groupDynamic: Partial<GroupDynamic>;
            memberEffects: Array<{
                memberId: string;
                engagement: number;
                mood: string;
            }>;
        };
        feedback: string;
        score: number;
    }>;
}

interface GroupTherapyScenario {
    id: string;
    title: string;
    description: string;
    therapeuticGoals: Array<string>;
    members: Array<GroupMember>;
    events: Array<GroupEvent>;
    duration: number;
}

interface GroupTherapyTutorialProps {
    userId: string;
    scenarioId: string;
    onComplete: (results: any) => void;
    className?: string;
}

export const GroupTherapyTutorial = ({ userId, scenarioId, onComplete }: GroupTherapyTutorialProps) => {
    const [scenario, setScenario] = useState<GroupTherapyScenario | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [groupDynamics, setGroupDynamics] = useState<GroupDynamic>({
        cohesion: 70,
        tension: 30,
        participation: 60,
        support: 65
    });
    const [currentEvent, setCurrentEvent] = useState<GroupEvent | null>(null);
    const [memberStates, setMemberStates] = useState<Array<GroupMember>>([]);
    const [facilitatorNotes, setFacilitatorNotes] = useState<string>('');
    const [interventions, setInterventions] = useState<Array<{
        timestamp: number;
        type: string;
        description: string;
        outcome: string;
    }>>([]);

    useEffect(() => {
        const fetchScenario = async () => {
            try {
                const response = await fetch(`/api/group-therapy/${scenarioId}`);
                if (response.ok) {
                    const data = await response.json();
                    setScenario(data);
                    setMemberStates(data.members);
                }
            }
            catch (error) {
                console.error('Error fetching scenario:', error);
            }
        };
        fetchScenario();
    }, [scenarioId]);

    useEffect(() => {
        if (!scenario) {
            return;
        }
        const timer = setInterval(() => {
            if (currentTime >= scenario.duration) {
                return;
            }
            setCurrentTime(prev => prev + 1);
            updateGroupDynamics();
            checkForEvents();
        }, 1000);
        return () => clearInterval(timer);
    }, [scenario, currentTime]);

    const updateGroupDynamics = () => {
        const averageEngagement = memberStates.reduce((sum, member) => sum + member.engagement, 0) /
            memberStates.length;
        setGroupDynamics(prev => ({
            ...prev,
            participation: averageEngagement,
            cohesion: Math.min(100, prev.cohesion +
                (averageEngagement > 70 ? 1 : -1) +
                (prev.support > 70 ? 1 : -1))
        }));
    };

    const checkForEvents = () => {
        if (!scenario) {
            return;
        }
        const event = scenario.events.find(e => !interventions.some(i => i.timestamp === currentTime));
        if (event) {
            setCurrentEvent(event);
            pauseScenario();
        }
    };

    const handleIntervention = (option: GroupEvent['options'][0]) => {
        if (!currentEvent) {
            return;
        }
        // Update group dynamics
        setGroupDynamics(prev => ({
            ...prev,
            ...option.impact.groupDynamic
        }));
        // Update member states
        setMemberStates(prev => prev.map(member => {
            const effect = option.impact.memberEffects.find(e => e.memberId === member.id);
            if (effect) {
                return {
                    ...member,
                    engagement: effect.engagement,
                    currentMood: effect.mood
                };
            }
            return member;
        }));
        // Record intervention
        setInterventions(prev => [
            ...prev,
            {
                timestamp: currentTime,
                type: currentEvent.type,
                description: option.text,
                outcome: option.feedback
            }
        ]);
        // Track in analytics
        AnalyticsService.trackResourceEngagement(userId, scenarioId, 'group_intervention', JSON.stringify({
            eventType: currentEvent.type,
            intervention: option.text,
            score: option.score
        }));
        setCurrentEvent(null);
        resumeScenario();
    };

    const pauseScenario = () => {
        // Implementation for pausing the scenario
    };

    const resumeScenario = () => {
        // Implementation for resuming the scenario
    };

    const handleComplete = () => {
        const results = {
            scenarioId,
            userId,
            finalGroupDynamics: groupDynamics,
            interventions,
            duration: currentTime,
            memberOutcomes: memberStates.map(member => ({
                memberId: member.id,
                finalEngagement: member.engagement,
                finalMood: member.currentMood
            })),
            facilitatorNotes,
            completedAt: new Date()
        };
        // Track completion in analytics
        AnalyticsService.trackTutorialProgress(userId, scenarioId, 100);
        onComplete(results);
    };

    if (!scenario) {
        return <div>Loading scenario...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Scenario Header */}
            <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{scenario.title}</h2>
                        <p className="text-gray-400">{scenario.description}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Session Time</div>
                        <div className="text-2xl font-bold">
                            {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    {scenario.therapeuticGoals.map((goal) => (
                        <Badge key={goal} variant="outline">
                            {goal}
                        </Badge>
                    ))}
                </div>
            </Card>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6">
                {/* Group Members */}
                <Card className="col-span-2 p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Group Members
                    </h3>
                    <div className="space-y-4">
                        {memberStates.map((member) => (
                            <Card key={member.id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-medium">{member.name}</h4>
                                        <p className="text-sm text-gray-400">{member.currentMood}</p>
                                    </div>
                                    <Badge variant={member.engagement > 70 ? 'default' : 'secondary'}>
                                        Engagement: {member.engagement}%
                                    </Badge>
                                </div>
                                <Progress value={member.engagement} className="h-1 mt-2" />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {member.presentingIssues.map((issue) => (
                                        <Badge key={issue} variant="outline" className="text-xs">
                                            {issue}
                                        </Badge>
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>

                {/* Group Dynamics */}
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Group Dynamics</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Cohesion</span>
                                <span className="text-sm text-gray-400">{groupDynamics.cohesion}%</span>
                            </div>
                            <Progress value={groupDynamics.cohesion} className="h-2"></Progress>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Tension</span>
                                <span className="text-sm text-gray-400">{groupDynamics.tension}%</span>
                            </div>
                            <Progress value={groupDynamics.tension} className="h-2"></Progress>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Participation</span>
                                <span className="text-sm text-gray-400">
                                    {groupDynamics.participation}%
                                </span>
                            </div>
                            <Progress value={groupDynamics.participation} className="h-2"></Progress>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Support</span>
                                <span className="text-sm text-gray-400">{groupDynamics.support}%</span>
                            </div>
                            <Progress value={groupDynamics.support} className="h-2"></Progress>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Event Handler */}
            {currentEvent && (<Card className="p-6 border-2 border-primary">
                <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-primary"></AlertCircle>
                    <h3 className="text-xl font-semibold">Group Event</h3>
                </div>
                <p className="mb-4">{currentEvent.description}</p>
                <div className="space-y-2">
                    {currentEvent.options.map(option => (<Button key={option.text} variant="outline" className="w-full text-left justify-start" onClick={() => handleIntervention(option)}>
                        {option.text}
                    </Button>))}
                </div>
            </Card>)}

            {/* Facilitator Tools */}
            <Tabs defaultValue="notes" className="w-full">
                <TabsList>
                    <TabsTrigger value="notes">Facilitator Notes</TabsTrigger>
                    <TabsTrigger value="interventions">Intervention History</TabsTrigger>
                </TabsList>
                <TabsContent value="notes">
                    <Card className="p-4">
                        <Textarea 
                            value={facilitatorNotes} 
                            onChange={(e) => setFacilitatorNotes(e.target.value)}
                            placeholder="Record your observations and thoughts here..."
                            className="min-h-[200px]"
                        />
                    </Card>
                </TabsContent>
                <TabsContent value="interventions">
                    <Card className="p-4">
                        <div className="space-y-2">
                            {interventions.map((intervention, index) => (<div key={index} className="p-3 bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                    <Badge variant="outline">{intervention.type}</Badge>
                                    <span className="text-sm text-gray-400">
                                        {Math.floor(intervention.timestamp / 60)}:
                                        {(intervention.timestamp % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <p className="text-sm mb-1">{intervention.description}</p>
                                <p className="text-sm text-gray-400">{intervention.outcome}</p>
                            </div>))}
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Complete Button */}
            <Button className="w-full" onClick={handleComplete} disabled={currentTime < scenario.duration}>
                Complete Session
            </Button>
        </div>
    );
};

export default GroupTherapyTutorial;
