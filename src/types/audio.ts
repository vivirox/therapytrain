import { EmotionalResponse } from './emotions';

export interface AudioFeatures {
  pitch: number;
  volume: number;
  tempo: number;
  spectralFeatures: {
    centroid: number;
    rolloff: number;
    flux: number;
  };
  mfcc: Float32Array;
}

export interface SpeechPatterns {
  speechRate: number;
  articulationQuality: number;
  prosody: {
    variation: number;
    rhythm: number;
  };
}

export interface AudioAnalysisResult {
  features: AudioFeatures;
  emotionalContent: EmotionalResponse;
  speechPatterns: SpeechPatterns;
  timestamp: Date;
  duration: number;
  sampleRate: number;
}

export interface AudioProcessingError {
  code: string;
  message: string;
  details?: any;
}

export type AudioProcessingStatus = 'idle' | 'recording' | 'processing' | 'error';

export interface AudioProcessingEvents {
  recordingStarted: void;
  recordingStopped: string; // audioUrl
  analysisComplete: AudioAnalysisResult;
  error: AudioProcessingError;
  statusChange: AudioProcessingStatus;
} 