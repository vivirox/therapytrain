import React, { useState, useEffect } from 'react';
import { Card } from '@/../../components/ui/card';
import { Button } from '@/../../components/ui/button';
import { Slider } from '@/../../components/ui/slider';
import { AnalyticsService } from '@/../../services/analytics';

interface SimulationInsight {
  timestamp: number;
  insight: string;
  type: 'observation' | 'feedback' | 'suggestion';
}

interface SimulationTutorialProps {
  userId: string;
  scenarioId: string;
  onComplete: () => void;
    className?: string;
}

export const SimulationTutorial: React.FC<SimulationTutorialProps> = ({
  userId,
  scenarioId,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userChoices, setUserChoices] = useState<string[]>([]);
  const [insights, setInsights] = useState<SimulationInsight[]>([]);
  const [empathyScore, setEmpathyScore] = useState(0);
  const [progress, setProgress] = useState(0);

  const scenario = {
    title: 'Client Crisis Intervention',
    description: 'Practice handling a crisis situation with a simulated client.',
    steps: [
      {
        title: 'Initial Assessment',
        content: 'A client calls expressing severe anxiety and suicidal thoughts. How do you respond?',
        options: [
          'Immediately ask about specific suicide plans',
          'Calmly acknowledge their feelings and establish rapport',
          'Direct them to emergency services',
          'Schedule an urgent in-person session'
        ]
      },
      {
        title: 'Safety Planning',
        content: 'The client indicates no immediate suicide plan but feels overwhelmed. What\'s your next step?',
        options: [
          'Create a detailed safety plan together',
          'Explore their support system',
          'Teach grounding techniques',
          'Assess their current coping mechanisms'
        ]
      },
      {
        title: 'Resource Connection',
        content: 'The client needs additional support. How do you proceed?',
        options: [
          'Provide crisis hotline numbers',
          'Connect with family members',
          'Arrange follow-up care',
          'Recommend support groups'
        ]
      }
    ]
  };

  useEffect(() => {
    setProgress((currentStep / (scenario.steps.length - 1)) * 100);
  }, [currentStep]);

  const handleChoice = (choice: string) => {
    setUserChoices(prev => [...prev, choice]);
    
    // Simulate AI analysis of choice
    const newInsight: SimulationInsight = {
      timestamp: Date.now(),
      insight: generateInsight(choice),
      type: 'feedback'
    };
    
    setInsights(prev => [...prev, newInsight]);
    
    // Track choice in analytics
    AnalyticsService.trackEvent({
      type: 'simulation_choice',
      userId,
      timestamp: Date.now(),
      data: {
        scenarioId,
        step: currentStep,
        choice
      }
    });

    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const generateInsight = (choice: string): string => {
    // Simplified insight generation based on choice
    const insights = {
      'Immediately ask about specific suicide plans': 
        'While assessment is important, building rapport first can help the client feel more comfortable sharing.',
      'Calmly acknowledge their feelings and establish rapport':
        'Excellent choice. Building trust and showing empathy helps create a safe space for the client.',
      'Direct them to emergency services':
        'Consider if immediate escalation is necessary. Sometimes clients need someone to listen first.',
      'Schedule an urgent in-person session':
        'Good thinking about face-to-face support, but ensure immediate safety first.',
      'Create a detailed safety plan together':
        'Collaborative safety planning empowers the client and provides clear steps for crisis moments.',
      'Explore their support system':
        'Understanding their support network is crucial for comprehensive care.',
      'Teach grounding techniques':
        'Practical coping strategies can help manage immediate distress.',
      'Assess their current coping mechanisms':
        'Building on existing strengths is an effective approach.',
      'Provide crisis hotline numbers':
        'Ensuring the client has emergency resources is important for ongoing support.',
      'Connect with family members':
        'Remember to maintain confidentiality while involving support systems.',
      'Arrange follow-up care':
        'Continuity of care is essential for long-term stability.',
      'Recommend support groups':
        'Peer support can be valuable, but ensure immediate needs are addressed first.'
    };
    
    return insights[choice as keyof typeof insights] || 'Consider the impact of your choice on the client\'s wellbeing.';
  };

  const handleComplete = () => {
    // Calculate final empathy score based on choices
    const finalScore = calculateEmpathyScore(userChoices);
    setEmpathyScore(finalScore);

    // Track completion in analytics
    AnalyticsService.trackEvent({
      type: 'simulation_complete',
      userId,
      timestamp: Date.now(),
      data: {
        scenarioId,
        score: finalScore,
        choices: userChoices
      }
    });

    onComplete();
  };

  const calculateEmpathyScore = (choices: string[]): number => {
    // Simplified scoring based on optimal choices
    const optimalChoices = [
      'Calmly acknowledge their feelings and establish rapport',
      'Create a detailed safety plan together',
      'Arrange follow-up care'
    ];

    const matchCount = choices.filter((choice: any, index: any) => 
      choice === optimalChoices[index]
    ).length;

    return (matchCount / optimalChoices.length) * 100;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">{scenario.title}</h2>
        <p className="text-gray-600 mb-6">{scenario.description}</p>
        
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {scenario.steps[currentStep].title}
          </h3>
          <p className="text-gray-600 mb-6">
            {scenario.steps[currentStep].content}
          </p>

          <div className="space-y-4">
            {scenario.steps[currentStep].options.map((option: any, index: any) => (
              <Button
                key={index}
                variant="outline"
                className="w-full text-left justify-start"
                onClick={() => handleChoice(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {insights.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Feedback & Insights</h3>
          <div className="space-y-4">
            {insights.map((insight: any, index: any) => (
              <div key={index} className="p-3 bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-400">
                  {Math.floor((insight.timestamp - Date.now()) / 1000)}s:{" "}
                </span>
                {insight.insight}
              </div>
            ))}
          </div>
        </Card>
      )}

      {empathyScore > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Empathy Score</label>
              <Slider
                value={[empathyScore]}
                max={100}
                step={1}
                disabled
              />
              <span className="text-sm text-gray-600">{Math.round(empathyScore)}%</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
