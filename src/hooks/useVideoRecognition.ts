import { useState, useEffect, useCallback } from 'react';
import { VideoRecognitionService } from '@/services/video/VideoRecognitionService';
import { VideoAnalysisResult } from '@/types/video';
import { EmotionalResponse } from '@/types/emotions';

interface UseVideoRecognitionOptions {
  onAnalysisComplete?: (result: VideoAnalysisResult) => void;
  onEmotionalStateUpdate?: (state: EmotionalResponse) => void;
  onError?: (error: { code: string; message: string }) => void;
  autoStart?: boolean;
  config?: {
    width?: number;
    height?: number;
    fps?: number;
    facingMode?: 'user' | 'environment';
  };
}

export function useVideoRecognition(options: UseVideoRecognitionOptions = {}) {
  const [status, setStatus] = useState<'idle' | 'initializing' | 'running' | 'error'>('idle');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);

  useEffect(() => {
    const videoService = VideoRecognitionService.getInstance();

    const handleStatusChange = (newStatus: string) => {
      setStatus(newStatus as any);
      if (newStatus === 'error') {
        setError({ code: 'STATUS_ERROR', message: 'Video recognition status error' });
      } else {
        setError(null);
      }
    };

    const handleAnalysisComplete = (result: VideoAnalysisResult) => {
      setAnalysisResult(result);
      options.onAnalysisComplete?.(result);
    };

    const handleEmotionalStateUpdate = (state: EmotionalResponse) => {
      options.onEmotionalStateUpdate?.(state);
    };

    const handleError = (err: { code: string; message: string }) => {
      setError(err);
      setStatus('error');
      options.onError?.(err);
    };

    // Subscribe to events
    videoService.on('statusChange', handleStatusChange);
    videoService.on('analysisComplete', handleAnalysisComplete);
    videoService.on('emotionalStateUpdated', handleEmotionalStateUpdate);
    videoService.on('error', handleError);

    // Initialize video service
    const initializeService = async () => {
      try {
        await videoService.initialize(options.config);
        if (options.autoStart) {
          await startAnalysis();
        }
      } catch (err) {
        handleError({
          code: 'INITIALIZATION_ERROR',
          message: err instanceof Error ? err.message : 'Failed to initialize video recognition',
        });
      }
    };

    initializeService();

    // Cleanup
    return () => {
      videoService.removeListener('statusChange', handleStatusChange);
      videoService.removeListener('analysisComplete', handleAnalysisComplete);
      videoService.removeListener('emotionalStateUpdated', handleEmotionalStateUpdate);
      videoService.removeListener('error', handleError);
      stopAnalysis();
    };
  }, [options.autoStart, options.config]);

  const startAnalysis = useCallback(async () => {
    try {
      const videoService = VideoRecognitionService.getInstance();
      await videoService.startVideoAnalysis();
    } catch (err) {
      setError({
        code: 'START_ERROR',
        message: err instanceof Error ? err.message : 'Failed to start video analysis',
      });
      setStatus('error');
    }
  }, []);

  const stopAnalysis = useCallback(async () => {
    try {
      const videoService = VideoRecognitionService.getInstance();
      await videoService.stopVideoAnalysis();
    } catch (err) {
      setError({
        code: 'STOP_ERROR',
        message: err instanceof Error ? err.message : 'Failed to stop video analysis',
      });
      setStatus('error');
    }
  }, []);

  return {
    status,
    error,
    analysisResult,
    startAnalysis,
    stopAnalysis,
    isRunning: status === 'running',
    isError: status === 'error',
  };
} 