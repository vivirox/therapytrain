import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, 
         Button, Chip, Grid, Alert } from '@mui/material';
import { LearningPathService } from '../../services/learningPath';
import { AIAnalyticsService } from '../../services/aiAnalytics';

interface LearningPathViewProps {
  userId: string;
  specialization: string;
  initialSkillLevels: Record<string, number>;
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({
  userId,
  specialization,
  initialSkillLevels
}) => {
  const [path, setPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
      const newPath = await learningPathService.generatePersonalizedPath(
        userId,
        specialization,
        initialSkillLevels
      );
      setPath(newPath);
      setCurrentNode(newPath.nodes.find(n => n.id === newPath.currentNodeId));
    } catch (err) {
      setError('Failed to load learning path');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeCompletion = async (nodeId: string, performance: any) => {
    try {
      await learningPathService.updatePathProgress(userId, path.id, nodeId, performance);
      await loadPath(); // Reload path to get updated recommendations
    } catch (err) {
      setError('Failed to update progress');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!path) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No learning path available
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {path.title}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        {path.description}
      </Typography>

      {/* Progress Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progress Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Completed Nodes</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(path.progress.completedNodes.length / path.nodes.length) * 100} 
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Total Hours</Typography>
              <Typography variant="h6">{path.progress.totalHours}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Current Pace</Typography>
              <Chip 
                label={path.aiRecommendations.paceAdjustment || 'maintain'} 
                color={path.aiRecommendations.paceAdjustment === 'increase' ? 'success' : 'default'}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Current Node */}
      {currentNode && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Focus
            </Typography>
            <Typography variant="subtitle1">{currentNode.title}</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {currentNode.description}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Required for Completion:
              </Typography>
              <Grid container spacing={1}>
                {currentNode.completionCriteria.requiredScore && (
                  <Grid item>
                    <Chip 
                      label={`Score: ${currentNode.completionCriteria.requiredScore * 100}%`} 
                      size="small" 
                    />
                  </Grid>
                )}
                {currentNode.completionCriteria.practiceHours && (
                  <Grid item>
                    <Chip 
                      label={`Practice: ${currentNode.completionCriteria.practiceHours}hrs`} 
                      size="small" 
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={() => handleNodeCompletion(currentNode.id, {
                score: 0.85, // This would come from actual assessment
                practiceHours: 2, // This would come from tracking
                skillProgress: { [specialization]: 0.1 } // This would come from assessments
              })}
            >
              Mark as Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Recommendations
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Focus Areas
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {path.aiRecommendations.focusAreas.map((area: string) => (
                  <Chip key={area} label={area} size="small" />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Supplementary Resources
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {path.aiRecommendations.supplementaryResources.map((resource: string) => (
                  <Chip key={resource} label={resource} size="small" variant="outlined" />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
