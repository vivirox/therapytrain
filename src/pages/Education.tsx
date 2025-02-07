import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext"; // Updated import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkillProgressionTracker } from "@/components/education/SkillProgressionTracker";
import { LearningPathView } from "@/components/education/LearningPathView";
import { CaseStudyLibrary } from "@/components/education/CaseStudyLibrary";
import { PeerLearning } from "@/components/education/PeerLearning";
import { TutorialCard } from "@/components/education/TutorialCard";
import { RecommendationEngine } from "@/services/recommendations";
import { LearningPathService } from "@/services/learningPath";
import { MdMenuBook, MdGroups, MdSchool, MdAssessment, MdPeople } from 'react-icons/md';
import type { Tutorial, CaseStudy, SkillProgression } from "@/types/education";
const Education = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth(); // Updated to use useAuth
    const [activeTab, setActiveTab] = useState<string>('learning-path');
    const [userProgress, setUserProgress] = useState<SkillProgression | null>(null);
    const [recommendations, setRecommendations] = useState<{
        recommendedTutorials: Array<Tutorial>;
        recommendedCaseStudies: Array<CaseStudy>;
    }>({ recommendedTutorials: [], recommendedCaseStudies: [] });
    useEffect(() => {
        if (loading)
            return; // Wait for loading to finish
        if (!user) {
            navigate('/auth');
            return;
        }
        const fetchUserData = async () => {
            try {
                const [progress, recs] = await Promise.all([
                    fetch(`/api/skill-progression/${user.id}`).then(res => res.json()),
                    RecommendationEngine.getRecommendedContent(user.id)
                ]);
                setUserProgress(progress);
                setRecommendations(recs);
            }
            catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [loading, navigate, user]);
    const renderContent = () => {
        switch (activeTab) {
            case 'learning-path':
                return (<div className="space-y-6">
            <SkillProgressionTracker userId={user?.id || ''}></SkillProgressionTracker>
            <LearningPathView userId={user?.id || ''} specialization={userProgress?.learningPath?.customizedFocus?.[0] || 'general'} initialSkillLevels={Object.fromEntries(Object.entries(userProgress?.skills || {}).map(([key, value]) => [key, value.level]))}/>
          </div>);
            case 'tutorials':
                return (<div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Recommended Tutorials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.recommendedTutorials.map(tutorial => (<TutorialCard key={tutorial.id} tutorial={tutorial} progress={userProgress?.skills?.[tutorial.category]?.completedTutorials?.includes(tutorial.id)} onClick={() => navigate(`/education/tutorial/${tutorial.id}`)}/>))}
            </div>
          </div>);
            case 'case-studies':
                return (<CaseStudyLibrary userId={user?.id || ''} recommendedCases={recommendations.recommendedCaseStudies}></CaseStudyLibrary>);
            case 'peer-learning':
                return <PeerLearning userId={user?.id || ''}></PeerLearning>;
            default:
                return null;
        }
    };
    return (<div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Professional Development</h1>
          <div className="flex items-center space-x-4">
            <button className="btn btn-primary" onClick={() => navigate('/education/assessment')}>
              Take Skills Assessment
            </button>
          </div>
        </header>

        <nav className="flex space-x-1 border-b">
          {[
            { id: 'learning-path', label: 'Learning Path' },
            { id: 'tutorials', label: 'Tutorials' },
            { id: 'case-studies', label: 'Case Studies' },
            { id: 'peer-learning', label: 'Peer Learning' },
        ].map(tab => (<button key={tab.id} className={`px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent hover:border-gray-300'}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>))}
        </nav>

        <main className="min-h-[600px]">
          {renderContent()}
        </main>
      </div>
    </div>);
};
export default Education;
