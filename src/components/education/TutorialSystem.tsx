import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tutorial, TutorialStep, SkillProgression } from '@/types/education';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { MdMenuBook as BookOpen, MdOndemandVideo as Video, MdPsychology as Brain, MdCheckCircle as CheckCircle, MdArrowForward as ArrowRight, MdStar as Star, MdAccessTime as Clock } from 'react-icons/md';
import { InteractiveElement } from '@/tutorial/interactiveelements';

interface TutorialSystemProps {
    userId: string;
    className?: string;
}

export const TutorialSystem: React.FC<TutorialSystemProps> = ({ userId }) => {
    const [tutorials, setTutorials] = useState<Array<Tutorial>>([]);
    const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
    const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
    const [skillProgression, setSkillProgression] = useState<SkillProgression | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        const fetchTutorials = async () => {
            try {
                const response = await fetch('/api/tutorials');
                if (response.ok) {
                    const data = await response.json();
                    setTutorials(data);
                }
            }
            catch (error) {
                console.error('Error fetching tutorials:', error);
            }
        };
        const fetchSkillProgression = async () => {
            try {
                const response = await fetch(`/api/skill-progression/${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setSkillProgression(data);
                }
            }
            catch (error) {
                console.error('Error fetching skill progression:', error);
            }
        };
        Promise.all([fetchTutorials(), fetchSkillProgression()])
            .finally(() => setLoading(false));
    }, [userId]);
    const startTutorial = (tutorial: Tutorial) => {
        setCurrentTutorial(tutorial);
        setCurrentStep(tutorial.steps[0]);
    };
    const nextStep = async () => {
        if (!currentTutorial || !currentStep)
            return;
        const currentIndex = currentTutorial.steps.findIndex(step => step.id === currentStep.id);
        if (currentIndex < currentTutorial.steps.length - 1) {
            setCurrentStep(currentTutorial.steps[currentIndex + 1]);
        }
        else {
            // Tutorial completed
            try {
                await fetch('/api/tutorial-completion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        tutorialId: currentTutorial.id,
                        completedAt: new Date().toISOString()
                    })
                });
                setCurrentTutorial(null);
                setCurrentStep(null);
                // Refresh skill progression
                const response = await fetch(`/api/skill-progression/${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setSkillProgression(data);
                }
            }
            catch (error) {
                console.error('Error recording tutorial completion:', error);
            }
        }
    };
    const renderStepContent = (step: TutorialStep) => {
        switch (step.type) {
            case 'video':
                return (<div className="aspect-video rounded-lg bg-gray-800">
            <Video className="w-full h-full text-gray-400"></Video>
            {step.content && (<div className="mt-4">
                <video src={step.content} controls className="w-full rounded-lg"/>
              </div>)}
          </div>);
            case 'interactive':
                return (<div className="p-4 border rounded-lg bg-gray-800">
            <InteractiveElement config={step.interactiveElements?.[0] || {
                        type: 'simulation',
                        data: { scenario: { setup: step.content, variables: {}, successCriteria: [] } }
                    }} onComplete={async (results: unknown) => {
                        // Record the results
                        await fetch('/api/tutorial-progress', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                tutorialId: currentTutorial?.id,
                                stepId: step.id,
                                results
                            })
                        });
                        nextStep();
                    }} onProgress={(progress: unknown) => {
                        // Update progress indicator
                    }}/>
          </div>);
            case 'quiz':
                return (<div className="space-y-4">
            <div className="prose prose-invert max-w-none mb-4">
              {step.content}
            </div>
            {step.interactiveElements?.map((element: any, index: any) => (<InteractiveElement key={index} config={element} onComplete={async (results: unknown) => {
                            await fetch('/api/quiz-submission', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId,
                                    tutorialId: currentTutorial?.id,
                                    stepId: step.id,
                                    results
                                })
                            });
                            nextStep();
                        }} onProgress={() => { }}/>))}
          </div>);
            default:
                return (<div className="prose prose-invert max-w-none">
            {step.content}
          </div>);
        }
    };
    if (loading) {
        return <div>Loading...</div>;
    }
    if (currentTutorial && currentStep) {
        return (<div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{currentTutorial.title}</h2>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4"></Clock>
            <span>{currentStep.duration} min</span>
          </div>
        </div>

        <Progress value={(currentTutorial.steps.findIndex(s => s.id === currentStep.id) + 1)
                / currentTutorial.steps.length * 100}/>

        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">{currentStep.title}</h3>
          {renderStepContent(currentStep)}
        </Card>

        <div className="flex justify-end">
          <Button onClick={nextStep}>
            {currentTutorial.steps.indexOf(currentStep) === currentTutorial.steps.length - 1
                ? 'Complete Tutorial'
                : 'Next Step'}
            <ArrowRight className="ml-2 w-4 h-4"></ArrowRight>
          </Button>
        </div>
      </div>);
    }
    return (<div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Interactive Tutorials</h1>
      
      {skillProgression && (<Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Learning Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500"></CheckCircle>
              <div>
                <div className="text-sm text-gray-400">Completed Tutorials</div>
                <div className="text-2xl font-bold">
                  {Object.values(skillProgression.skills).reduce((acc: any, skill: any) => acc + skill.completedTutorials.length, 0)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500"></Star>
              <div>
                <div className="text-sm text-gray-400">Skills Progressing</div>
                <div className="text-2xl font-bold">
                  {Object.keys(skillProgression.skills).length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-500"></Clock>
              <div>
                <div className="text-sm text-gray-400">Practice Hours</div>
                <div className="text-2xl font-bold">
                  {Object.values(skillProgression.skills).reduce((acc: any, skill: any) => acc + skill.practiceHours, 0)}
                </div>
              </div>
            </div>
          </div>
        </Card>)}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials.map((tutorial: any) => (<Card key={tutorial.id} className="p-6 hover:border-primary transition-colors cursor-pointer" onClick={() => startTutorial(tutorial)}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{tutorial.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{tutorial.description}</p>
              </div>
              {tutorial.type === 'video' ? (<Video className="w-8 h-8 text-primary"></Video>) : (<BookOpen className="w-8 h-8 text-primary"></BookOpen>)}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4"></Clock>
                <span>{tutorial.estimatedDuration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4"></Brain>
                <span>{tutorial.difficulty}</span>
              </div>
            </div>
          </Card>))}
      </div>
    </div>);
};
export default TutorialSystem;
