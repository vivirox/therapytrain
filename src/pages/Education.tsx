import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authcontext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkillProgressionTracker } from '@/components/education/SkillProgressionTracker';
import { LearningPathView } from '@/components/education/LearningPathView';
import { CaseStudyLibrary } from '@/components/education/CaseStudyLibrary';
import { PeerLearning } from '@/components/education/peerlearning';
import { TutorialCard } from '@/components/education/TutorialCard';
import { getRecommendations } from '@/services/recommendations';
import { LearningPathService } from '@/services/learningpath';
import { MdMenuBook, MdGroups, MdSchool, MdAssessment, MdPeople } from 'react-icons/md';
import type { Tutorial, CaseStudy, SkillProgression } from '@/types/education';
import { ErrorBoundary } from '@/components/errorboundary';

const Education: React.FC = () => {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [activeTab, setActiveTab] = useState<string>('learning-path');
    const [userProgress, setUserProgress] = useState<SkillProgression | null>(null);
    const [recommendations, setRecommendations] = useState<{
        recommendedTutorials: Array<Tutorial>;
        recommendedCaseStudies: Array<CaseStudy>;
    }>({ recommendedTutorials: [], recommendedCaseStudies: [] });
    const [skills, setSkills] = useState([
        { id: '1', name: 'Python', progress: 75, level: 'Advanced' },
        { id: '2', name: 'React', progress: 60, level: 'Intermediate' },
        { id: '3', name: 'TypeScript', progress: 45, level: 'Beginner' },
    ]);

    const [learningPath] = useState({
        id: '1',
        title: 'Full Stack Development',
        description: 'Master full stack development with modern technologies',
        steps: [
            {
                id: '1',
                title: 'Frontend Basics',
                description: 'Learn HTML, CSS, and JavaScript fundamentals',
                completed: true,
            },
            {
                id: '2',
                title: 'React Development',
                description: 'Build modern UIs with React and TypeScript',
                completed: false,
            },
            {
                id: '3',
                title: 'Backend Development',
                description: 'Create APIs with Node.js and Express',
                completed: false,
            },
        ],
    });

    const [caseStudies] = useState([
        {
            id: '1',
            title: 'E-commerce Platform',
            description: 'Build a full-stack e-commerce platform with React and Node.js',
            difficulty: 'Intermediate',
            url: '/case-studies/e-commerce',
        },
        {
            id: '2',
            title: 'Chat Application',
            description: 'Create a real-time chat app with WebSocket',
            difficulty: 'Advanced',
            url: '/case-studies/chat-app',
        },
    ]);

    const [peerSessions] = useState([
        {
            id: '1',
            title: 'React Best Practices',
            description: 'Discussion about React patterns and best practices',
            date: '2024-03-20',
            participants: 3,
            maxParticipants: 5,
            status: 'upcoming',
        },
        {
            id: '2',
            title: 'TypeScript Workshop',
            description: 'Hands-on TypeScript exercises and tips',
            date: '2024-03-22',
            participants: 4,
            maxParticipants: 6,
            status: 'in-progress',
        },
    ]);

    useEffect(() => {
        if (loading)
            return;
        if (!user) {
            router.push('/auth');
            return;
        }
        const fetchUserData = async () => {
            try {
                const [progress, recs] = await Promise.all([
                    fetch(`/api/skill-progression/${user.id}`).then(res => res.json()),
                    getRecommendations(user.id)
                ]);
                setUserProgress(progress);
                setRecommendations(recs);
            }
            catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [loading, router, user]);

    const renderContent = () => {
        switch (activeTab) {
            case 'learning-path':
                return (<div className="space-y-6">
                    <SkillProgressionTracker skills={skills} />
                    <LearningPathView path={learningPath} onStepComplete={handleStepComplete} />
                </div>);
            case 'tutorials':
                return (<div className="space-y-6">
                    <h2 className="text-2xl font-semibold mb-4">Recommended Tutorials</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recommendations.recommendedTutorials.map(tutorial => (
                            <TutorialCard
                                key={tutorial.id}
                                tutorial={tutorial}
                                progress={userProgress?.skills?.[tutorial.category]?.completedTutorials?.includes(tutorial.id)}
                                onClick={() => router.push(`/education/tutorial/${tutorial.id}`)}
                            />
                        ))}
                    </div>
                </div>);
            case 'case-studies':
                return (<CaseStudyLibrary caseStudies={caseStudies} />);
            case 'peer-learning':
                return <PeerLearning sessions={peerSessions} onJoinSession={handleJoinSession} />;
            default:
                return null;
        }
    };

    const handleStepComplete = (stepId: string) => {
        console.log('Step completed:', stepId);
    };

    const handleJoinSession = (sessionId: string) => {
        console.log('Joining session:', sessionId);
    };

    return (
        <ErrorBoundary>
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col space-y-6">
                    <header className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold">Professional Development</h1>
                        <div className="flex items-center space-x-4">
                            <button className="btn btn-primary" onClick={() => router.push('/education/assessment')}>
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
                        ].map((tab: any) => (<button key={tab.id} className={`px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent hover:border-gray-300'}`} onClick={() => setActiveTab(tab.id)}>
                                {tab.label}
                            </button>))}
                    </nav>

                    <main className="min-h-[600px]">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default Education;
