import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import TutorialSystem from '../components/education/TutorialSystem';
import CaseStudyLibrary from '../components/education/CaseStudyLibrary';
import SkillProgressionTracker from '../components/education/SkillProgressionTracker';
import PeerLearning from '../components/education/PeerLearning';
import { LearningPathView } from '../components/education/LearningPathView';
import { RecommendationEngine } from '../services/recommendations';
import { LearningPathService } from '../services/learningPath';
import { useAuth } from '../components/auth/AuthProvider';
import { 
  BookOpen, 
  Users, 
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Map
} from 'lucide-react';

const Education = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('learning-path');
  const [recommendations, setRecommendations] = useState<{
    recommendedTutorials: any[];
    recommendedCaseStudies: any[];
  }>({ recommendedTutorials: [], recommendedCaseStudies: [] });
  const [userSkills, setUserSkills] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      try {
        const [tutorials, caseStudies] = await Promise.all([
          RecommendationEngine.getRecommendedTutorials(user.id),
          RecommendationEngine.getRecommendedCaseStudies(user.id)
        ]);
        setRecommendations({ recommendedTutorials: tutorials, recommendedCaseStudies: caseStudies });
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    };

    const fetchUserSkills = async () => {
      if (!user) return;
      try {
        // This would come from your skills tracking system
        const skills = {
          'clinical-skills': 0.4,
          'crisis-management': 0.3,
          'therapeutic-techniques': 0.5,
          'client-engagement': 0.6
        };
        setUserSkills(skills);
      } catch (error) {
        console.error('Failed to fetch user skills:', error);
      }
    };

    fetchRecommendations();
    fetchUserSkills();
  }, [user]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Professional Development</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 max-w-[800px] mb-6">
          <TabsTrigger value="learning-path" className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Learning Path
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Tutorials
          </TabsTrigger>
          <TabsTrigger value="case-studies" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Case Studies
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="peer-learning" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Peer Learning
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learning-path">
          <Card>
            <div className="p-6">
              {user && (
                <LearningPathView
                  userId={user.id}
                  specialization="therapeutic-techniques"
                  initialSkillLevels={userSkills}
                />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tutorials">
          <Card>
            <div className="p-6">
              <TutorialSystem 
                recommendedTutorials={recommendations.recommendedTutorials} 
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="case-studies">
          <Card>
            <div className="p-6">
              <CaseStudyLibrary 
                recommendedCaseStudies={recommendations.recommendedCaseStudies} 
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <div className="p-6">
              <SkillProgressionTracker userId={user?.id} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="peer-learning">
          <Card>
            <div className="p-6">
              <PeerLearning userId={user?.id} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-4">AI Learning Insights</h2>
              {/* AI Insights component would go here */}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Education;
