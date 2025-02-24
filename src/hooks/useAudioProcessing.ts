import { useState, useEffect, useCallback } from 'react';
import { AudioProcessingService } from '@/services/audio/AudioProcessingService';
import {
  AudioAnalysisResult,
  AudioProcessingError,
  AudioProcessingStatus
} from '@/types/audio';

interface UseAudioProcessingOptions {
  onAnalysisComplete?: (result: AudioAnalysisResult) => void;
  onError?: (error: AudioProcessingError) => void;
  autoStart?: boolean;
}

export function useAudioProcessing(options: UseAudioProcessingOptions = {}) {
  const [status, setStatus] = useState<AudioProcessingStatus>('idle');
  const [error, setError] = useState<AudioProcessingError | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);

  useEffect(() => {
    const audioService = AudioProcessingService.getInstance();

    const handleRecordingStarted = () => {
      setStatus('recording');
      setError(null);
    };

    const handleRecordingStopped = (url: string) => {
      setAudioUrl(url);
      setStatus('processing');
    };

    const handleAnalysisComplete = (result: AudioAnalysisResult) => {
      setAnalysisResult(result);
      setStatus('idle');
      options.onAnalysisComplete?.(result);
    };

    const handleError = (err: AudioProcessingError) => {
      setError(err);
      setStatus('error');
      options.onError?.(err);
    };

    const handleStatusChange = (newStatus: AudioProcessingStatus) => {
      setStatus(newStatus);
    };

    // Subscribe to events
    audioService.on('recordingStarted', handleRecordingStarted);
    audioService.on('recordingStopped', handleRecordingStopped);
    audioService.on('analysisComplete', handleAnalysisComplete);
    audioService.on('error', handleError);
    audioService.on('statusChange', handleStatusChange);

    // Auto-start if specified
    if (options.autoStart) {
      startRecording().catch(handleError);
    }

    // Cleanup
    return () => {
      audioService.removeListener('recordingStarted', handleRecordingStarted);
      audioService.removeListener('recordingStopped', handleRecordingStopped);
      audioService.removeListener('analysisComplete', handleAnalysisComplete);
      audioService.removeListener('error', handleError);
      audioService.removeListener('statusChange', handleStatusChange);
    };
  }, [options.autoStart, options.onAnalysisComplete, options.onError]);

  const startRecording = useCallback(async () => {
    try {
      const audioService = AudioProcessingService.getInstance();
      await audioService.startRecording();
    } catch (err) {
      const error: AudioProcessingError = {
        code: 'RECORDING_START_ERROR',
        message: err instanceof Error ? err.message : 'Failed to start recording',
        details: err
      };
      setError(error);
      setStatus('error');
      options.onError?.(error);
    }
  }, [options.onError]);

  const stopRecording = useCallback(async () => {
    try {
      const audioService = AudioProcessingService.getInstance();
      await audioService.stopRecording();
    } catch (err) {
      const error: AudioProcessingError = {
        code: 'RECORDING_STOP_ERROR',
        message: err instanceof Error ? err.message : 'Failed to stop recording',
        details: err
      };
      setError(error);
      setStatus('error');
      options.onError?.(error);
    }
  }, [options.onError]);

  return {
    status,
    error,
    audioUrl,
    analysisResult,
    startRecording,
    stopRecording,
    isRecording: status === 'recording',
    isProcessing: status === 'processing',
    isError: status === 'error'
  };
} 