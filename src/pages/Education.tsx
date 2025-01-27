import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import TutorialSystem from '../components/education/TutorialSystem';
import CaseStudyLibrary from '../components/education/CaseStudyLibrary';
import SkillProgressionTracker from '../components/education/SkillProgressionTracker';
import PeerLearning from '../components/education/PeerLearning';
import { LearningPathView } from '../components/education/LearningPathView';
import { RecommendationEngine } from '../services/recommendations';
import { LearningPathService } from '../services/learningPath';
import { 
  MdMenuBook as BookOpen, 
  MdGroups as Users, 
  MdTrendingUp as TrendingUp,
  MdLightbulb as Lightbulb,
  MdMessage as MessageSquare,
  MdAutoAwesome as Sparkles,
  MdMap as Map,
  MdArrowBack as ArrowLeft
} from 'react-icons/md';

const Education = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useKindeAuth();
  const [activeTab, setActiveTab] = useState('learning-path');
  const [recommendations, setRecommendations] = useState<{
    recommendedTutorials: any[];
    recommendedCaseStudies: any[];
  }>({ recommendedTutorials: [], recommendedCaseStudies: [] });
  const [userSkills, setUserSkills] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
  }, [isAuthenticated, navigate]);

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
        // TODO: Implement MongoDB-based skills tracking
        const skills = {
          'clinical-skills': 0.4,
          'crisis-management': 0.3,
          'therapeutic-techniques': 0.6,
          'patient-communication': 0.7,
          'assessment': 0.5
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
    <div className="min-h-screen bg-[#0A0A0B] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <BookOpen className="h-8 w-8 mr-4 text-blue-500" />
            Learning Center
          </h1>
          <p className="text-gray-400 mt-2">
            Enhance your therapeutic skills through our comprehensive learning resources
          </p>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-[#1A1A1D] border-gray-800">
            <TabsTrigger value="learning-path" className="data-[state=active]:bg-blue-600">
              <Map className="h-4 w-4 mr-2" />
              Learning Path
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="data-[state=active]:bg-blue-600">
              <BookOpen className="h-4 w-4 mr-2" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="case-studies" className="data-[state=active]:bg-blue-600">
              <Lightbulb className="h-4 w-4 mr-2" />
              Case Studies
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-blue-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Skills Tracker
            </TabsTrigger>
            <TabsTrigger value="peer-learning" className="data-[state=active]:bg-blue-600">
              <Users className="h-4 w-4 mr-2" />
              Peer Learning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="learning-path" className="space-y-4">
            <LearningPathView 
              userId={user?.id || ''} 
              specialization="general"
              initialSkillLevels={userSkills}
            />
          </TabsContent>

          <TabsContent value="tutorials" className="space-y-4">
            <TutorialSystem
              tutorials={recommendations.recommendedTutorials}
              userId={user?.id || ''}
            />
          </TabsContent>

          <TabsContent value="case-studies" className="space-y-4">
            <CaseStudyLibrary
              caseStudies={recommendations.recommendedCaseStudies}
              userId={user?.id || ''}
            />
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <SkillProgressionTracker
              skillLevels={userSkills}
              userId={user?.id || ''}
            />
          </TabsContent>

          <TabsContent value="peer-learning" className="space-y-4">
            <PeerLearning userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Education;
