import { EventEmitter } from 'events';
import { FilesetResolver, GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import { singleton } from '@/lib/decorators';
import { AuditService } from '../AuditService';
import { GestureDetectionResult, HandLandmark } from '@/types/video';

export interface GestureRecognitionConfig {
  minHandDetectionConfidence: number;
  minHandPresenceConfidence: number;
  minTrackingConfidence: number;
  runningMode: 'VIDEO' | 'IMAGE';
}

@singleton
export class MediaPipeService extends EventEmitter {
  private static instance: MediaPipeService;
  private readonly auditService: AuditService;
  private gestureRecognizer: GestureRecognizer | null = null;
  private isInitialized = false;
  private lastProcessedFrame = 0;
  private processingQueue: Array<{
    frame: HTMLVideoElement | HTMLImageElement;
    resolve: (result: GestureDetectionResult | null) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  // Frame rate control
  private readonly MIN_FRAME_TIME = 1000 / 30; // Max 30 FPS
  private lastFrameTime = 0;

  private constructor() {
    super();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): MediaPipeService {
    if (!MediaPipeService.instance) {
      MediaPipeService.instance = new MediaPipeService();
    }
    return MediaPipeService.instance;
  }

  public async initialize(config?: Partial<GestureRecognitionConfig>): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create vision tasks module with optimized settings
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        {
          baseOptions: {
            modelAssetPath: '/models/mediapipe/gesture_recognizer.task',
            delegate: 'GPU'
          }
        }
      );

      // Initialize gesture recognizer with optimized settings
      this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/mediapipe/gesture_recognizer.task',
          delegate: 'GPU',
          enableModelCaching: true
        },
        runningMode: config?.runningMode || 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: config?.minHandDetectionConfidence || 0.5,
        minHandPresenceConfidence: config?.minHandPresenceConfidence || 0.5,
        minTrackingConfidence: config?.minTrackingConfidence || 0.5
      });

      this.isInitialized = true;
      this.emit('initialized');

      await this.auditService.logEvent('mediapipe_initialized', {
        config,
        delegate: 'GPU',
        modelCaching: true
      });

      // Start processing queue
      this.processQueue();
    } catch (error) {
      await this.auditService.logEvent('mediapipe_initialization_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    while (this.processingQueue.length > 0) {
      const task = this.processingQueue[0];
      try {
        const result = await this.processFrame(task.frame);
        task.resolve(result);
      } catch (error) {
        task.reject(error instanceof Error ? error : new Error('Unknown error'));
      }
      this.processingQueue.shift();
    }
    this.isProcessing = false;
  }

  private async processFrame(
    frame: HTMLVideoElement | HTMLImageElement
  ): Promise<GestureDetectionResult | null> {
    if (!this.isInitialized || !this.gestureRecognizer) {
      throw new Error('MediaPipe service not initialized');
    }

    const currentTime = performance.now();
    const timeSinceLastFrame = currentTime - this.lastFrameTime;

    // Frame rate control
    if (timeSinceLastFrame < this.MIN_FRAME_TIME) {
      return null;
    }

    try {
      const startTime = performance.now();
      const results = this.gestureRecognizer.recognize(frame);

      if (!results.landmarks.length || !results.gestures.length) {
        return null;
      }

      // Convert MediaPipe results to our GestureDetectionResult format
      const result: GestureDetectionResult = {
        gesture: results.gestures[0][0]?.categoryName || 'unknown',
        confidence: results.gestures[0][0]?.score || 0,
        landmarks: results.landmarks.map(handLandmarks => 
          handLandmarks.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
          }))
        ),
      };

      // Update timing
      this.lastFrameTime = currentTime;
      const duration = performance.now() - startTime;

      // Log performance metrics for slow recognitions
      if (duration > 100) {
        await this.auditService.logEvent('gesture_recognition_performance', {
          duration,
          numHands: results.landmarks.length,
          fps: 1000 / duration
        });
      }

      return result;
    } catch (error) {
      await this.auditService.logEvent('gesture_recognition_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  public async recognizeGestures(
    frame: HTMLVideoElement | HTMLImageElement
  ): Promise<GestureDetectionResult | null> {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({ frame, resolve, reject });
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  public async cleanup(): Promise<void> {
    // Clear processing queue
    this.processingQueue = [];
    this.isProcessing = false;

    if (this.gestureRecognizer) {
      this.gestureRecognizer.close();
      this.gestureRecognizer = null;
      this.isInitialized = false;
    }
  }
} 