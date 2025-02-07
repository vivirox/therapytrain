import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/../components/ui/card";
import { Button } from "@/../components/ui/button";
import { Badge } from "@/../components/ui/badge";
import { Progress } from "@/../components/ui/progress";
import { Alert, AlertDescription } from "@/../components/ui/alert";
import { ScrollArea } from "@/../components/ui/scroll-area";
import { Separator } from "@/../components/ui/separator";
import { LearningPathService } from "@/../services/learningPath";
import { AIAnalyticsService } from "@/../services/aiAnalytics";
import { Loading } from "@/../components/ui/loading";
interface LearningPathViewProps {
    userId: string;
    specialization: string;
    initialSkillLevels: Record<string, number>;
    className?: string;
}
export const LearningPathView: React.FC = ({ userId, specialization, initialSkillLevels }) => {
    const [path, setPath] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentNode, setCurrentNode] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const learningPathService = new LearningPathService();
    const aiAnalytics = new AIAnalyticsService();
    useEffect(() => {
        loadPath();
    }, [userId, specialization]);
    const loadPath = async () => {
        try {
            setLoading(true);
            const newPath = await learningPathService.generatePersonalizedPath(userId, specialization, initialSkillLevels);
            setPath(newPath);
            setCurrentNode(newPath.nodes.find(n => n.id === newPath.currentNodeId));
        }
        catch (err) {
            setError('Failed to load learning path');
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleNodeCompletion = async (nodeId: string, performance: any) => {
        try {
            await learningPathService.updatePathProgress(userId, path.id, nodeId, performance);
            await loadPath(); // Reload path to get updated recommendations
        }
        catch (err) {
            setError('Failed to update progress');
            console.error(err);
        }
    };
    if (loading) {
        return <Loading message="Loading your learning path..."></Loading>;
    }
    if (error) {
        return (<Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    if (!path) {
        return (<Alert>
        <AlertDescription>No learning path available.</AlertDescription>
      </Alert>);
    }
    return (<div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">{path.title}</h2>
        <p className="text-muted-foreground">
          {path.description}
        </p>
        <Progress value={(path.progress.completedNodes.length / path.nodes.length) * 100}></Progress>
        <p className="text-sm text-muted-foreground">
          Overall Progress: {Math.round((path.progress.completedNodes.length / path.nodes.length) * 100)}%
        </p>
      </div>

      <Separator ></Separator>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold">Progress Overview</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-medium">Completed Nodes</h4>
              <Progress value={(path.progress.completedNodes.length / path.nodes.length) * 100}></Progress>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-medium">Total Hours</h4>
              <p className="text-muted-foreground">{path.progress.totalHours}</p>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-medium">Current Pace</h4>
              <Badge variant={path.aiRecommendations.paceAdjustment === 'increase' ? 'success' : 'default'}>
                {path.aiRecommendations.paceAdjustment || 'maintain'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentNode && (<Card>
          <CardHeader>
            <h3 className="text-2xl font-semibold">Current Focus</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-medium">{currentNode.title}</h4>
              </div>
              <p className="text-muted-foreground">{currentNode.description}</p>
              <div className="flex items-center space-x-4">
                <Button onClick={() => handleNodeCompletion(currentNode.id, {
                score: 0.85, // This would come from actual assessment
                practiceHours: 2, // This would come from tracking
                skillProgress: { [specialization]: 0.1 } // This would come from assessments
            })}>
                  Mark as Complete
                </Button>
              </div>
              <div className="flex items-center space-x-4">
                <h4 className="text-xl font-medium">Required for Completion:</h4>
                {currentNode.completionCriteria.requiredScore && (<Badge variant="secondary">
                    Score: {currentNode.completionCriteria.requiredScore * 100}%
                  </Badge>)}
                {currentNode.completionCriteria.practiceHours && (<Badge variant="secondary">
                    Practice: {currentNode.completionCriteria.practiceHours}hrs
                  </Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>)}

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold">AI Recommendations</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-medium">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {path.aiRecommendations.focusAreas.map((area: string) => (<Badge key={area} variant="secondary">
                    {area}
                  </Badge>))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-medium">Supplementary Resources</h4>
              <div className="flex flex-wrap gap-2">
                {path.aiRecommendations.supplementaryResources.map((resource: string) => (<Badge key={resource} variant="secondary">
                    {resource}
                  </Badge>))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);
};
