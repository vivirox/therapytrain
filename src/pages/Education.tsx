import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import TutorialSystem from '../components/education/TutorialSystem';
import CaseStudyLibrary from '../components/education/CaseStudyLibrary';
import SkillProgressionTracker from '../components/education/SkillProgressionTracker';
import PeerLearning from '../components/education/PeerLearning';
import { RecommendationEngine } from '../services/recommendations';
import { useAuth } from '../hooks/useAuth';
import { 
  BookOpen, 
  Users, 
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Sparkles
} from 'lucide-react';

const Education = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tutorials');
  const [recommendations, setRecommendations] = useState<{
    recommendedTutorials: any[];
    recommendedCaseStudies: any[];
  }>({ recommendedTutorials: [], recommendedCaseStudies: [] });

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      try {
        const [tutorials, caseStudies] = await Promise.all([
          fetch('/api/tutorials').then(res => res.json()),
          fetch('/api/case-studies').then(res => res.json())
        ]);

        const recs = await RecommendationEngine.getRecommendations(
          user.id,
          tutorials,
          caseStudies
        );
        setRecommendations(recs);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    };

    fetchRecommendations();
  }, [user]);

  if (!user) {
    return <div>Please log in to access educational resources</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center text-center mb-12">
          <Lightbulb className="w-16 h-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold mb-4">TherapyTrain Education</h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Enhance your therapeutic skills through interactive tutorials, 
            real-world case studies, and personalized skill tracking
          </p>
        </div>

        {/* Recommended Content */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Recommended Tutorials
              </h3>
              <div className="space-y-4">
                {recommendations.recommendedTutorials.map(tutorial => (
                  <div key={tutorial.id} className="p-4 bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">{tutorial.title}</h4>
                    <p className="text-sm text-gray-400 mb-2">
                      {tutorial.description}
                    </p>
                    <div className="text-sm text-primary">
                      Why this is recommended:
                      <ul className="list-disc list-inside mt-1">
                        {tutorial.reasons.map((reason: string, index: number) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recommended Case Studies
              </h3>
              <div className="space-y-4">
                {recommendations.recommendedCaseStudies.map(study => (
                  <div key={study.id} className="p-4 bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">{study.title}</h4>
                    <p className="text-sm text-gray-400 mb-2">
                      {study.description}
                    </p>
                    <div className="text-sm text-primary">
                      Why this is recommended:
                      <ul className="list-disc list-inside mt-1">
                        {study.reasons.map((reason: string, index: number) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Tabs
          defaultValue="tutorials"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="grid grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="tutorials" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="case-studies" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Case Studies
            </TabsTrigger>
            <TabsTrigger value="progression" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              My Progress
            </TabsTrigger>
            <TabsTrigger value="peer-learning" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Peer Learning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="mt-6">
            <TutorialSystem userId={user.id} />
          </TabsContent>

          <TabsContent value="case-studies" className="mt-6">
            <CaseStudyLibrary userId={user.id} />
          </TabsContent>

          <TabsContent value="progression" className="mt-6">
            <SkillProgressionTracker userId={user.id} />
          </TabsContent>

          <TabsContent value="peer-learning" className="mt-6">
            <PeerLearning userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Education;
