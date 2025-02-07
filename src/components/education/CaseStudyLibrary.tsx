import React, { useState, useEffect } from 'react';
import { CaseStudy } from "@/types/education";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MdSearch as Search, MdMenuBook as BookOpen, MdGroups as Users, MdPsychology as Brain, MdMessage as MessageSquare, MdLightbulb as Lightbulb, MdLabel as Tag } from 'react-icons/md';

interface CaseStudyLibraryProps {
    userId: string;
    recommendedCases?: Array<CaseStudy>;
    className?: string;
}

export const CaseStudyLibrary: React.FC<CaseStudyLibraryProps> = ({ userId, recommendedCases = [] }) => {
    const [caseStudies, setCaseStudies] = useState<Array<CaseStudy>>([]);
    const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filters,] = useState<{
        issues: Array<string>;
        approaches: Array<string>;
    }>({
        issues: [],
        approaches: []
    });
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        const fetchCaseStudies = async () => {
            try {
                const response = await fetch('/api/case-studies');
                if (response.ok) {
                    const data = await response.json();
                    setCaseStudies([...recommendedCases, ...data]);
                }
            }
            catch (error) {
                console.error('Error fetching case studies:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchCaseStudies();
    }, [userId, recommendedCases]);
    const filteredCaseStudies = caseStudies.filter((study: any) => {
        const matchesSearch = searchTerm === '' ||
            study.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            study.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesIssues = filters.issues.length === 0 ||
            study.clientProfile.presentingIssues.some(issue => filters.issues.includes(issue));
        const matchesApproaches = filters.approaches.length === 0 ||
            filters.approaches.includes(study.therapeuticProcess.approach);
        return matchesSearch && matchesIssues && matchesApproaches;
    });
    const recordCaseStudyView = async (caseStudyId: string) => {
        try {
            await fetch('/api/case-study-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    caseStudyId,
                    viewedAt: new Date().toISOString()
                })
            });
        }
        catch (error) {
            console.error('Error recording case study view:', error);
        }
    };
    if (loading) {
        return <div>Loading...</div>;
    }
    if (selectedCase) {
        return (<div className="max-w-4xl mx-auto p-6 space-y-8">
        <Button variant="ghost" onClick={() => setSelectedCase(null)} className="mb-4">
          ← Back to Library
        </Button>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold">{selectedCase.title}</h2>
          <p className="text-gray-400">{selectedCase.description}</p>

          <Card className="p-6 space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5"></Users>
              Client Profile
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Demographics</h4>
                <p>{selectedCase.clientProfile.demographics}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Presenting Issues</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.clientProfile.presentingIssues.map((issue: any) => (<Badge key={issue} variant="secondary">
                      {issue}
                    </Badge>))}
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Background</h4>
              <p>{selectedCase.clientProfile.background}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Behavioral Patterns</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.clientProfile.behavioralPatterns.map((pattern: any) => (<li key={pattern}>{pattern}</li>))}
              </ul>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5"></Brain>
              Therapeutic Process
            </h3>
            <div>
              <h4 className="font-medium mb-2">Approach</h4>
              <p>{selectedCase.therapeuticProcess.approach}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Key Interventions</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.therapeuticProcess.keyInterventions.map((intervention: any) => (<li key={intervention}>{intervention}</li>))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Challenges</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.therapeuticProcess.challenges.map((challenge: any) => (<li key={challenge}>{challenge}</li>))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Outcomes</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.therapeuticProcess.outcomes.map((outcome: any) => (<li key={outcome}>{outcome}</li>))}
              </ul>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5"></Lightbulb>
              Learning Resources
            </h3>
            <div>
              <h4 className="font-medium mb-2">Learning Objectives</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.learningObjectives.map((objective: any) => (<li key={objective}>{objective}</li>))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Discussion Questions</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.discussionQuestions.map((question: any) => (<li key={question}>{question}</li>))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Expert Insights</h4>
              <ul className="list-disc list-inside space-y-1">
                {selectedCase.expertInsights.map((insight: any) => (<li key={insight}>{insight}</li>))}
              </ul>
            </div>
          </Card>
        </div>
      </div>);
    }
    return (<div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Case Study Library</h1>

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></Search>
          <Input type="text" placeholder="Search case studies..." className="pl-10" value={searchTerm} onChange={(e: unknown) => setSearchTerm(e.target.value)}/>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filter badges would go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCaseStudies.map((study: any) => (<Card key={study.id} className="p-6 hover:border-primary transition-colors cursor-pointer" onClick={() => {
                setSelectedCase(study);
                recordCaseStudyView(study.id);
            }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{study.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{study.description}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary"></BookOpen>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {study.clientProfile.presentingIssues.slice(0, 3).map((issue: any) => (<Badge key={issue} variant="secondary">
                    {issue}
                  </Badge>))}
                {study.clientProfile.presentingIssues.length > 3 && (<Badge variant="secondary">
                    +{study.clientProfile.presentingIssues.length - 3}
                  </Badge>)}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4"></Brain>
                  <span>{study.therapeuticProcess.approach}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4"></MessageSquare>
                  <span>{study.discussionQuestions.length} questions</span>
                </div>
              </div>
            </div>
          </Card>))}
      </div>
    </div>);
};
export default CaseStudyLibrary;
