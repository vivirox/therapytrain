import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MdAccessTime, MdMenuBook, MdGroups, MdStar } from 'react-icons/md';
import type { Tutorial as FullTutorial } from '@/types/education';

interface TutorialCardProps {
    tutorial: FullTutorial;
    progress?: boolean;
    onClick?: () => void;
    className?: string;
}

export const TutorialCard: React.FC = ({ tutorial, progress, onClick }: TutorialCardProps) => {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner':
                return 'bg-green-100 text-green-800';
            case 'intermediate':
                return 'bg-yellow-100 text-yellow-800';
            case 'advanced':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'interactive':
                return <MdGroups className="h-4 w-4" />;
            case 'video':
                return <MdMenuBook className="h-4 w-4" />;
            case 'simulation':
                return <MdStar className="h-4 w-4" />;
            default:
                return <MdMenuBook className="h-4 w-4" />;
        }
    };

    return (
        <Card 
            className={`hover:shadow-lg transition-shadow cursor-pointer ${progress ? 'border-green-500' : ''}`} 
            onClick={onClick}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{tutorial.title}</CardTitle>
                    {getTypeIcon(tutorial.type)}
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 mb-4">{tutorial.description}</p>
                
                <div className="flex items-center space-x-2 mb-3">
                    <MdAccessTime className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{tutorial.estimatedDuration} min</span>
                    <Badge className={getDifficultyColor(tutorial.difficulty)}>
                        {tutorial.difficulty}
                    </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {tutorial.tags.map((tag: any) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                        </Badge>
                    ))}
                </div>

                {progress && (
                    <div className="mt-4">
                        <Progress value={100} className="h-2" />
                        <p className="text-xs text-green-600 mt-1">Completed</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
