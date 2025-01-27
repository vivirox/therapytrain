import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import {
  MdPlayArrow as Play,
  MdPause as Pause,
  MdRefresh as RotateCcw,
  MdCheckCircle as CheckCircle,
  MdCancel as XCircle,
  MdHelpOutline as HelpCircle,
  MdMessage as MessageSquare
} from 'react-icons/md';

interface Choice {
  id: string;
  text: string;
  feedback: string;
  isCorrect: boolean;
}

interface SimulationStep {
  id: string;
  situation: string;
  clientResponse: string;
  choices: Choice[];
  feedback: {
    positive: string[];
    negative: string[];
  };
}

interface RoleplayScenario {
  id: string;
  title: string;
  description: string;
  clientBackground: string;
  presentingIssue: string;
  goals: string[];
  steps: SimulationStep[];
}

interface InteractiveTutorialProps {
  scenario: RoleplayScenario;
  onComplete: (results: any) => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  scenario,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [feedback, setFeedback] = useState<string[]>([]);
  const [responses, setResponses] = useState<Array<{
    stepId: string;
    choiceId: string;
    success: boolean;
  }>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customResponse, setCustomResponse] = useState('');
  const [showHint, setShowHint] = useState(false);

  const currentSimulation = scenario.steps[currentStep];

  const handleChoiceSelection = (choiceId: string) => {
    const choice = currentSimulation.choices.find(c => c.id === choiceId);
    if (!choice) return;

    setSelectedChoice(choiceId);
    setFeedback([choice.feedback]);
    setResponses(prev => [
      ...prev,
      {
        stepId: currentSimulation.id,
        choiceId: choice.id,
        success: choice.isCorrect
      }
    ]);
  };

  const handleCustomResponse = () => {
    // Here we would typically send the custom response to an AI model
    // for analysis and feedback
    setFeedback(['Your response has been recorded for review.']);
    setCustomResponse('');
  };

  const nextStep = () => {
    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedChoice('');
      setFeedback([]);
      setShowHint(false);
    } else {
      const results = {
        scenarioId: scenario.id,
        completedAt: new Date(),
        responses,
        successRate:
          responses.filter(r => r.success).length / scenario.steps.length
      };
      onComplete(results);
    }
  };

  const resetStep = () => {
    setSelectedChoice('');
    setFeedback([]);
    setCustomResponse('');
    setShowHint(false);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Step {currentStep + 1} of {scenario.steps.length}</span>
          <span>
            {Math.round(((currentStep + 1) / scenario.steps.length) * 100)}%
            Complete
          </span>
        </div>
        <Progress
          value={((currentStep + 1) / scenario.steps.length) * 100}
          className="h-2"
        />
      </div>

      {/* Scenario Context */}
      <Card className="p-6 bg-gray-900">
        <h2 className="text-xl font-semibold mb-4">{scenario.title}</h2>
        <p className="text-gray-400 mb-4">{scenario.description}</p>
        <div className="space-y-2">
          <Badge variant="outline">Client Background</Badge>
          <p>{scenario.clientBackground}</p>
        </div>
        <div className="space-y-2 mt-4">
          <Badge variant="outline">Presenting Issue</Badge>
          <p>{scenario.presentingIssue}</p>
        </div>
      </Card>

      {/* Current Simulation */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Current Situation</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayback}
              className="w-8 h-8 p-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetStep}
              className="w-8 h-8 p-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="mb-2 text-gray-400">Situation:</p>
            <p>{currentSimulation.situation}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="mb-2 text-gray-400">Client Response:</p>
            <p>{currentSimulation.clientResponse}</p>
          </div>

          <div className="space-y-4">
            <p className="font-medium">How would you respond?</p>

            <RadioGroup
              value={selectedChoice}
              onValueChange={handleChoiceSelection}
              className="space-y-3"
            >
              {currentSimulation.choices.map(choice => (
                <div key={choice.id} className="flex items-start space-x-3">
                  <RadioGroupItem value={choice.id} id={choice.id} />
                  <Label
                    htmlFor={choice.id}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {choice.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Or provide your own response:</p>
              <Textarea
                value={customResponse}
                onChange={e => setCustomResponse(e.target.value)}
                placeholder="Type your response here..."
                className="min-h-[100px]"
              />
              <Button
                variant="outline"
                onClick={handleCustomResponse}
                disabled={!customResponse.trim()}
              >
                Submit Custom Response
              </Button>
            </div>
          </div>

          {/* Feedback Section */}
          {feedback.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Feedback</h4>
              {feedback.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-4 rounded-lg bg-gray-800"
                >
                  {selectedChoice && currentSimulation.choices.find(
                    c => c.id === selectedChoice
                  )?.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <p>{item}</p>
                </div>
              ))}
            </div>
          )}

          {/* Hint System */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </Button>
            <Button
              onClick={nextStep}
              disabled={!selectedChoice && !customResponse}
              className="flex items-center gap-2"
            >
              {currentStep === scenario.steps.length - 1
                ? 'Complete Scenario'
                : 'Next Step'}
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>

          {showHint && (
            <Card className="p-4 bg-gray-800">
              <h5 className="font-medium mb-2">Helpful Tips:</h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                <li>Consider the client's emotional state</li>
                <li>Think about their presenting issue</li>
                <li>Remember your therapeutic goals</li>
              </ul>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InteractiveTutorial;
