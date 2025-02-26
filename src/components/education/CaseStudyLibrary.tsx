import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, ExternalLink } from 'lucide-react';

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  url: string;
}

interface CaseStudyLibraryProps {
  caseStudies: CaseStudy[];
}

export function CaseStudyLibrary({ caseStudies }: CaseStudyLibraryProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          Case Study Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {caseStudies.map((study) => (
            <Card key={study.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium">{study.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      study.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                      study.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {study.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{study.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(study.url, '_blank')}
                  >
                    View Case Study
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 