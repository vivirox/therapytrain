import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface LearningStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  steps: LearningStep[];
}

interface LearningPathViewProps {
  path: LearningPath;
  onStepComplete: (stepId: string) => void;
}

export function LearningPathView({ path, onStepComplete }: LearningPathViewProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{path.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6">{path.description}</p>
        <div className="space-y-4">
          {path.steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-4 border rounded-lg ${
                step.completed ? 'bg-primary/10 border-primary' : 'bg-background'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Step {index + 1}: {step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
                <Button
                  variant={step.completed ? "outline" : "default"}
                  size="sm"
                  onClick={() => onStepComplete(step.id)}
                  disabled={step.completed}
                >
                  {step.completed ? 'Completed' : 'Mark Complete'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 