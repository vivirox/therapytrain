import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, CheckCircle } from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface TutorialCardProps {
  tutorial: Tutorial;
  progress?: boolean;
  onClick: () => void;
}

export function TutorialCard({ tutorial, progress, onClick }: TutorialCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            {tutorial.title}
          </span>
          {progress && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{tutorial.description}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tutorial.duration}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              tutorial.level === 'Beginner' ? 'bg-green-100 text-green-700' :
              tutorial.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {tutorial.level}
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={onClick}
          >
            {progress ? 'Continue Tutorial' : 'Start Tutorial'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 