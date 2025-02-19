import { FaceLandmarks68 } from 'face-api.js';

export interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  facingMode: 'user' | 'environment';
}

export interface FaceDetectionResult {
  expressions: Record<string, number>;
  landmarks: FaceLandmarks68;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureCategory {
  categoryName: string;
  score: number;
}

export interface GestureDetectionResult {
  gesture: string;
  confidence: number;
  landmarks: HandLandmark[][];
}

export interface VideoAnalysisResult {
  faceDetection: FaceDetectionResult | null;
  gestureDetection: GestureDetectionResult | null;
  timestamp: Date;
  duration: number;
}

export type VideoRecognitionStatus = 'idle' | 'initializing' | 'running' | 'error'; 