import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
  Alert,
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { ChatWindow } from '../chat/ChatWindow';
import { AudioAnalysisDisplay } from '../audio/AudioAnalysisDisplay';
import { EmotionalTrendsDisplay } from './EmotionalTrendsDisplay';
import { VideoAnalysisDisplay } from '../video/VideoAnalysisDisplay';
import { useTherapySession } from '@/hooks/useTherapySession';
import { AIIntegrationService } from '@/services/AIIntegrationService';
import { AudioAnalysisResult } from '@/types/audio';
import { VideoAnalysisResult } from '@/types/video';
import { EmotionalResponse } from '@/types/emotions';
import { ModelMetrics } from '@/types/models';

const DRAWER_WIDTH = 400;

interface TherapySessionProps {
  sessionId: string;
  className?: string;
}

export const TherapySession: React.FC<TherapySessionProps> = ({
  sessionId,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isDrawerOpen, setIsDrawerOpen] = useState(!isMobile);
  const [aiError, setAIError] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);

  const {
    session,
    messages,
    emotionalContext,
    sendMessage,
    isLoading,
    error,
    updateEmotionalState,
    reload
  } = useTherapySession(sessionId, {
    enableEmotionalAnalysis: true
  });

  const aiService = AIIntegrationService.getInstance();

  useEffect(() => {
    setIsDrawerOpen(!isMobile);
  }, [isMobile]);

  const handleAnalysisComplete = async (result: AudioAnalysisResult) => {
    try {
      // Get AI prediction for emotional state
      const aiPrediction = await aiService.getModelPrediction(sessionId, {
        audioFeatures: result.features,
        timestamp: result.timestamp,
      });

      // Combine AI prediction with audio analysis
      const combinedEmotionalState: EmotionalResponse = {
        primary: aiPrediction.primary,
        probabilities: {
          ...result.emotionalContent.probabilities,
          ...aiPrediction.probabilities,
        },
        intensity: (result.emotionalContent.intensity + aiPrediction.confidence) / 2,
        confidence: (result.emotionalContent.confidence + aiPrediction.confidence) / 2,
        timestamp: new Date(),
      };

      // Update emotional state
      await updateEmotionalState(combinedEmotionalState);
      setAIError(null);
    } catch (err) {
      setAIError(err instanceof Error ? err.message : 'Failed to process AI prediction');
      // Fall back to audio analysis only
      await updateEmotionalState(result.emotionalContent);
    }
  };

  const handleVideoAnalysisComplete = async (result: VideoAnalysisResult) => {
    if (result.faceDetection) {
      // Update emotional state with face detection results
      await updateEmotionalState({
        primary: Object.entries(result.faceDetection.expressions)
          .reduce((max, [emotion, probability]) => 
            probability > max.probability ? { emotion, probability } : max,
            { emotion: 'neutral', probability: 0 }
          ).emotion as any,
        probabilities: {
          joy: result.faceDetection.expressions.happy || 0,
          sadness: result.faceDetection.expressions.sad || 0,
          anger: result.faceDetection.expressions.angry || 0,
          fear: result.faceDetection.expressions.fearful || 0,
          neutral: result.faceDetection.expressions.neutral || 0,
        },
        intensity: result.faceDetection.confidence,
        confidence: result.faceDetection.confidence,
        timestamp: result.timestamp,
      });
    }
  };

  useEffect(() => {
    // Fetch model metrics periodically
    const fetchMetrics = async () => {
      try {
        const metrics = await aiService.getModelMetrics(sessionId);
        if (metrics) {
          setModelMetrics(metrics);
        }
      } catch (err) {
        console.error('Failed to fetch model metrics:', err);
      }
    };

    const intervalId = setInterval(fetchMetrics, 60000); // Every minute
    fetchMetrics(); // Initial fetch

    return () => clearInterval(intervalId);
  }, [sessionId]);

  const drawer = (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        height: '100%',
        overflow: 'auto',
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderLeft: '1px solid',
          borderColor: 'divider'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6">Session Analysis</Typography>
        {isMobile && (
          <IconButton
            onClick={() => setIsDrawerOpen(false)}
            sx={{ marginLeft: 'auto' }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ padding: 2 }}>
        {aiError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            AI Service: {aiError}
          </Alert>
        )}

        <VideoAnalysisDisplay
          onAnalysisComplete={handleVideoAnalysisComplete}
          onEmotionalStateUpdate={updateEmotionalState}
          sx={{ mb: 2 }}
        />

        <AudioAnalysisDisplay
          onAnalysisComplete={handleAnalysisComplete}
        />

        {emotionalContext && (
          <>
            <Box my={2}>
              <Divider />
            </Box>
            <EmotionalTrendsDisplay
              emotionalContext={emotionalContext}
              modelMetrics={modelMetrics}
              onRefresh={reload}
            />
          </>
        )}
      </Box>
    </Box>
  );

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">
          Error loading session: {error.message}
        </Typography>
      </Box>
    );
  }

  if (isLoading || !session) {
    return (
      <Box p={3}>
        <Typography>Loading session...</Typography>
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ display: 'flex', height: '100%' }}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography variant="h6">
            {session.title || 'Therapy Session'}
          </Typography>
          {isMobile && !isDrawerOpen && (
            <IconButton
              onClick={() => setIsDrawerOpen(true)}
              sx={{ marginLeft: 'auto' }}
            >
              <ChevronLeftIcon />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatWindow
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </Box>
      </Box>

      {isMobile ? (
        <Drawer
          anchor="right"
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          variant="temporary"
          PaperProps={{
            sx: {
              width: DRAWER_WIDTH
            }
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          anchor="right"
          open={isDrawerOpen}
          variant="persistent"
          PaperProps={{
            sx: {
              width: DRAWER_WIDTH
            }
          }}
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
}; 