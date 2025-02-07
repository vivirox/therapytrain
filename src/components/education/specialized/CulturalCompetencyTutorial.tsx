import React, { useState, useEffect } from 'react';
import { Card } from '@/ui/card';
import { Button } from '@/ui/button';
import { Progress } from '@/ui/progress';
import { Badge } from '@/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { MdPublic as Globe, MdGroups as Users, MdMenuBook as BookOpen, MdMessage as MessageCircle, MdFavorite as Heart, MdCheckCircle as Check, MdWarning as AlertTriangle, MdPsychology as Brain } from 'react-icons/md';
import { AnalyticsService } from '@/../services/analytics';
import { AIAnalyticsService } from '@/../services/aianalytics';
interface CulturalContext {
    id: string;
    name: string;
    values: string[];
    traditions: string[];
    beliefs: string[];
    communication: {
        verbal: string[];
        nonverbal: string[];
        taboos: string[];
    };
    familyDynamics: string[];
    healthBeliefs: string[];
}
interface CaseStudy {
    id: string;
    title: string;
    description: string;
    culturalContext: CulturalContext;
    challengePoints: Array<{
        id: string;
        situation: string;
        culturalFactors: string[];
        options: Array<{
            id: string;
            action: string;
            rationale: string;
            impact: {
                rapport: number;
                understanding: number;
                effectiveness: number;
            };
            culturalConsiderations: string[];
        }>;
    }>;
}
interface CompetencyMetrics {
    awareness: number;
    knowledge: number;
    skills: number;
    rapport: number;
}
interface CulturalCompetencyTutorialProps {
    userId: string;
    caseStudyId: string;
    onComplete: (results: any) => void;
    className?: string;
}
export const CulturalCompetencyTutorial: React.FC = ({ userId, caseStudyId, onComplete }) => {
    const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
    const [currentChallenge, setCurrentChallenge] = useState<number>(0);
    const [metrics, setMetrics] = useState<CompetencyMetrics>({
        awareness: 40,
        knowledge: 30,
        skills: 35,
        rapport: 45
    });
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [reflections, setReflections] = useState<Array<{
        challengeId: string;
        notes: string;
        insights: string[];
    }>>([]);
    const [feedback, setFeedback] = useState<Array<{
        type: 'success' | 'warning' | 'insight';
        message: string;
    }>>([]);
    useEffect(() => {
        const fetchCaseStudy = async () => {
            try {
                const response = await fetch(`/api/cultural-case-studies/${caseStudyId}`);
                if (response.ok) {
                    const data = await response.json();
                    setCaseStudy(data);
                }
            }
            catch (error) {
                console.error('Error fetching case study:', error);
            }
        };
        fetchCaseStudy();
    }, [caseStudyId]);
    useEffect(() => {
        if (!caseStudy || selectedOptions.length === 0)
            return;
        const generateFeedback = async () => {
            try {
                const adaptiveFeedback = await AIAnalyticsService.generateAdaptiveFeedback(userId, {
                    metrics,
                    selectedOptions,
                    currentChallenge: caseStudy.challengePoints[currentChallenge]
                });
                setFeedback(prev => [
                    ...prev,
                    {
                        type: adaptiveFeedback.confidenceLevel > 0.7 ? 'success' : 'insight',
                        message: adaptiveFeedback.feedback
                    }
                ]);
            }
            catch (error) {
                console.error('Error generating feedback:', error);
            }
        };
        generateFeedback();
    }, [selectedOptions]);
    const handleOptionSelect = (option: any) => {
        setSelectedOptions(prev => [...prev, option.id]);
        updateMetrics(option.impact);
        setReflections(prev => {
            const challenge = caseStudy?.challengePoints[currentChallenge];
            if (!challenge)
                return prev;
            return [
                ...prev,
                {
                    challengeId: challenge.id,
                    notes: `Selected action: ${option.action}`,
                    insights: option.culturalConsiderations
                }
            ];
        });
    };
    const updateMetrics = (impact: any) => {
        setMetrics(prev => ({
            awareness: Math.min(100, prev.awareness + (impact.understanding * 0.5)),
            knowledge: Math.min(100, prev.knowledge + (impact.effectiveness * 0.3)),
            skills: Math.min(100, prev.skills + (impact.effectiveness * 0.7)),
            rapport: Math.min(100, prev.rapport + impact.rapport)
        }));
    };
    const moveToNextChallenge = () => {
        if (!caseStudy)
            return;
        if (currentChallenge < caseStudy.challengePoints.length - 1) {
            setCurrentChallenge(prev => prev + 1);
            setSelectedOptions([]);
        }
        else {
            handleComplete();
        }
    };
    const handleComplete = async () => {
        const results = {
            caseStudyId,
            userId,
            finalMetrics: metrics,
            reflections,
            selectedOptions,
            completedAt: new Date()
        };
        try {
            const skillAnalysis = await AIAnalyticsService.analyzeCognitiveDevelopment(userId, results);
            // Track completion in analytics
            AnalyticsService.trackTutorialProgress(userId, caseStudyId, 100);
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
    if (!caseStudy) {
        return <div>Loading case study...</div>;
    }
    const currentChallengePoint = caseStudy.challengePoints[currentChallenge];
    return (<div className="max-w-6xl mx-auto space-y-8">
      {/* Case Study Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{caseStudy.title}</h2>
            <p className="text-gray-400">{caseStudy.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary"></Globe>
            <span className="text-sm">Cultural Competency Training</span>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Competency Metrics */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Competency Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Cultural Awareness</span>
                <span className="text-sm text-gray-400">{metrics.awareness}%</span>
              </div>
              <Progress value={metrics.awareness} className="h-2"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Cultural Knowledge</span>
                <span className="text-sm text-gray-400">{metrics.knowledge}%</span>
              </div>
              <Progress value={metrics.knowledge} className="h-2"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Cross-cultural Skills</span>
                <span className="text-sm text-gray-400">{metrics.skills}%</span>
              </div>
              <Progress value={metrics.skills} className="h-2"></Progress>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Therapeutic Rapport</span>
                <span className="text-sm text-gray-400">{metrics.rapport}%</span>
              </div>
              <Progress value={metrics.rapport} className="h-2"></Progress>
            </div>
          </div>
        </Card>

        {/* Cultural Context and Challenges */}
        <Card className="col-span-2 p-6">
          <Tabs defaultValue="context">
            <TabsList>
              <TabsTrigger value="context">Cultural Context</TabsTrigger>
              <TabsTrigger value="challenge">Current Challenge</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
            </TabsList>

            <TabsContent value="context" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Values & Beliefs</h4>
                  <ul className="space-y-2">
                    {caseStudy.culturalContext.values.map((value: any, index: any) => (<li key={index} className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-primary"></Heart>
                        <span>{value}</span>
                      </li>))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Communication Styles</h4>
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Verbal</h5>
                    <ul className="space-y-1">
                      {caseStudy.culturalContext.communication.verbal.map((style: any, index: any) => (<li key={index} className="text-sm">{style}</li>))}
                    </ul>
                    <h5 className="text-sm font-medium">Non-verbal</h5>
                    <ul className="space-y-1">
                      {caseStudy.culturalContext.communication.nonverbal.map((style: any, index: any) => (<li key={index} className="text-sm">{style}</li>))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Family Dynamics</h4>
                  <ul className="space-y-2">
                    {caseStudy.culturalContext.familyDynamics.map((dynamic: any, index: any) => (<li key={index} className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary"></Users>
                          <span>{dynamic}</span>
                        </li>))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Health Beliefs</h4>
                  <ul className="space-y-2">
                    {caseStudy.culturalContext.healthBeliefs.map((belief: any, index: any) => (<li key={index} className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary"></Brain>
                          <span>{belief}</span>
                        </li>))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="challenge" className="space-y-4">
              <div className="mb-6">
                <h4 className="font-medium mb-2">Situation</h4>
                <p>{currentChallengePoint.situation}</p>
                
                <div className="mt-4">
                  <h5 className="text-sm font-medium mb-2">Cultural Factors</h5>
                  <div className="flex flex-wrap gap-2">
                    {currentChallengePoint.culturalFactors.map((factor: any, index: any) => (<Badge key={index} variant="outline" className="text-sm">
                        {factor}
                      </Badge>))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Response Options</h4>
                {currentChallengePoint.options.map((option: any) => (<div key={option.id} className="p-4 border rounded-lg hover:bg-primary/5">
                    <div className="mb-2">
                      <h5 className="font-medium">{option.action}</h5>
                      <p className="text-sm text-gray-400">{option.rationale}</p>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4"></Heart>
                        <span className="text-sm">+{option.impact.rapport}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="w-4 h-4"></Brain>
                        <span className="text-sm">
                          +{option.impact.understanding}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-4 h-4"></Check>
                        <span className="text-sm">
                          +{option.impact.effectiveness}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => handleOptionSelect(option)} disabled={selectedOptions.includes(option.id)}>
                      Select Response
                    </Button>
                  </div>))}
              </div>

              {selectedOptions.length > 0 && (<Button className="w-full mt-4" onClick={moveToNextChallenge}>
                  {currentChallenge < caseStudy.challengePoints.length - 1
                ? 'Next Challenge'
                : 'Complete Case Study'}
                </Button>)}
            </TabsContent>

            <TabsContent value="reflections" className="space-y-4">
              <div className="space-y-4">
                {reflections.map((reflection: any, index: any) => (<div key={index} className="p-4 bg-primary/5 rounded-lg">
                    <p className="mb-2">{reflection.notes}</p>
                    <div className="space-y-2">
                      {reflection.insights.map((insight: any, i: any) => (<div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                          <BookOpen className="w-4 h-4"></BookOpen>
                          <span>{insight}</span>
                        </div>))}
                    </div>
                  </div>))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Feedback Area */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Learning Insights</h3>
        <div className="space-y-3">
          {feedback.map((item: any, index: any) => (<div key={index} className={`p-4 rounded-lg ${item.type === 'success'
                ? 'bg-green-500/10'
                : item.type === 'warning'
                    ? 'bg-yellow-500/10'
                    : 'bg-blue-500/10'}`}>
              <div className="flex items-center gap-2">
                {item.type === 'success' ? (<Check className="w-5 h-5 text-green-500"></Check>) : item.type === 'warning' ? (<AlertTriangle className="w-5 h-5 text-yellow-500"></AlertTriangle>) : (<Brain className="w-5 h-5 text-blue-500"></Brain>)}
                <p>{item.message}</p>
              </div>
            </div>))}
        </div>
      </Card>
    </div>);
};
export default CulturalCompetencyTutorial;
