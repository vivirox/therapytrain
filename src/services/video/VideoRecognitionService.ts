import { EventEmitter } from 'events';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import { EmotionalResponse, EmotionProbabilities } from '@/types/emotions';
import { AuditService } from '../AuditService';
import { PrivacyService } from '../PrivacyService';
import { MediaPipeService } from './MediaPipeService';
import { singleton } from '@/lib/decorators';

interface VideoConfig {
  width: number;
  height: number;
  fps: number;
  facingMode: 'user' | 'environment';
}

interface FaceDetectionResult {
  expressions: Record<string, number>;
  landmarks: faceapi.FaceLandmarks68;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

interface GestureDetectionResult {
  gesture: string;
  confidence: number;
  landmarks: number[][];
}

interface VideoAnalysisResult {
  faceDetection: FaceDetectionResult | null;
  gestureDetection: GestureDetectionResult | null;
  timestamp: Date;
  duration: number;
}

type VideoRecognitionStatus = 'idle' | 'initializing' | 'running' | 'error';

@singleton
export class VideoRecognitionService extends EventEmitter {
  private static instance: VideoRecognitionService;
  private readonly auditService: AuditService;
  private readonly privacyService: PrivacyService;
  private readonly mediaPipeService: MediaPipeService;

  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private faceDetectionNet: faceapi.FaceDetectionNet | null = null;
  private faceExpressionNet: faceapi.FaceExpressionNet | null = null;
  private faceLandmarkNet: faceapi.FaceLandmark68Net | null = null;
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private status: VideoRecognitionStatus = 'idle';
  private config: VideoConfig = {
    width: 640,
    height: 480,
    fps: 30,
    facingMode: 'user'
  };

  private constructor() {
    super();
    this.auditService = AuditService.getInstance();
    this.privacyService = PrivacyService.getInstance();
    this.mediaPipeService = MediaPipeService.getInstance();
  }

  public static getInstance(): VideoRecognitionService {
    if (!VideoRecognitionService.instance) {
      VideoRecognitionService.instance = new VideoRecognitionService();
    }
    return VideoRecognitionService.instance;
  }

  public async initialize(config?: Partial<VideoConfig>): Promise<void> {
    try {
      this.status = 'initializing';
      this.emit('statusChange', this.status);

      // Update config
      this.config = { ...this.config, ...config };

      // Load face-api.js models
      await this.loadFaceModels();

      // Initialize MediaPipe
      await this.mediaPipeService.initialize({
        runningMode: 'VIDEO',
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.status = 'idle';
      this.emit('statusChange', this.status);

      await this.auditService.logEvent('video_recognition_initialized', {
        config: this.config,
      });
    } catch (error) {
      this.status = 'error';
      this.emit('statusChange', this.status);
      this.emit('error', {
        code: 'INITIALIZATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to initialize video recognition',
      });
      throw error;
    }
  }

  private async loadFaceModels(): Promise<void> {
    try {
      const modelPath = '/models/face-api';
      
      // Configure TensorFlow for optimal performance
      await tf.ready();
      
      // Enable WebGL backend with optimizations
      if (tf.env().get('WEBGL_VERSION') > 0) {
        await tf.setBackend('webgl');
        const gl = tf.backend().getGPGPUContext().gl;
        
        // Enable WebGL optimizations
        gl.getExtension('WEBGL_lose_context');
        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_half_float');
        gl.getExtension('WEBGL_color_buffer_float');
        
        // Configure WebGL for better performance
        await tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
        await tf.env().set('WEBGL_PACK', true);
        await tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);
        await tf.env().set('WEBGL_FLUSH_THRESHOLD', 1);
        await tf.env().set('CPU_HANDOFF_SIZE_THRESHOLD', 128);
      }

      // Initialize memory management
      tf.engine().startScope();
      
      // Configure tensor disposal strategy
      const TENSOR_DISPOSE_BATCH = 50;
      let tensorCount = 0;
      tf.tidy(() => {
        const disposeTensors = () => {
          if (tensorCount >= TENSOR_DISPOSE_BATCH) {
            tf.engine().endScope();
            tf.engine().startScope();
            tensorCount = 0;
          }
          tensorCount++;
        };
        tf.engine().registerTensor = ((originalRegister) => {
          return (tensor: tf.Tensor) => {
            disposeTensors();
            return originalRegister(tensor);
          };
        })(tf.engine().registerTensor);
      });

      // Load models in parallel with progress tracking
      const modelPromises = [
        {
          name: 'Face Detection',
          promise: faceapi.nets.tinyFaceDetector.load(modelPath)
        },
        {
          name: 'Face Expression',
          promise: faceapi.nets.faceExpressionNet.load(modelPath)
        },
        {
          name: 'Face Landmarks',
          promise: faceapi.nets.faceLandmark68Net.load(modelPath)
        }
      ];

      let loadedCount = 0;
      await Promise.all(
        modelPromises.map(async ({ name, promise }) => {
          await promise;
          loadedCount++;
          this.emit('modelLoadProgress', {
            model: name,
            progress: loadedCount / modelPromises.length
          });
        })
      );

      await this.auditService.logEvent('face_models_loaded', {
        backend: tf.getBackend(),
        memoryInfo: tf.memory(),
        webglVersion: tf.env().get('WEBGL_VERSION'),
        webglFlags: {
          forceF16: tf.env().get('WEBGL_FORCE_F16_TEXTURES'),
          pack: tf.env().get('WEBGL_PACK'),
          packDepthwise: tf.env().get('WEBGL_PACK_DEPTHWISECONV'),
          flushThreshold: tf.env().get('WEBGL_FLUSH_THRESHOLD'),
          cpuHandoff: tf.env().get('CPU_HANDOFF_SIZE_THRESHOLD')
        }
      });
    } catch (error) {
      await this.auditService.logEvent('face_models_load_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async performAnalysis(): Promise<void> {
    if (!this.videoElement || this.status !== 'running') return;

    let input: tf.Tensor | null = null;
    const startTime = performance.now();

    try {
      // Ensure privacy compliance
      const isCompliant = await this.privacyService.validateDataPrivacy({
        dataType: 'video',
        purpose: 'analysis',
      });

      if (!isCompliant) {
        throw new Error('Privacy requirements not met for video analysis');
      }

      // Create tensor from video frame with optimizations
      input = tf.tidy(() => {
        // Use lower precision for better performance
        const pixels = tf.browser.fromPixels(this.videoElement!);
        const normalized = tf.div(tf.sub(pixels, 127.5), 127.5);
        
        // Optimize tensor for WebGL
        if (tf.getBackend() === 'webgl') {
          return tf.cast(normalized, 'float16');
        }
        return normalized;
      });

      // Perform face detection with optimized settings
      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224, // Reduced for better performance
        scoreThreshold: 0.5
      });

      // Run face detection and gesture recognition in parallel
      const [faceDetections, gestureResults] = await Promise.all([
        faceapi
          .detectSingleFace(input, detectionOptions)
          .withFaceLandmarks()
          .withFaceExpressions(),
        this.mediaPipeService.recognizeGestures(this.videoElement)
      ]);

      // Skip processing if no detections
      if (!faceDetections && !gestureResults) {
        return;
      }

      // Convert detection results
      const result: VideoAnalysisResult = {
        faceDetection: faceDetections ? {
          expressions: Object.fromEntries(
            Object.entries(faceDetections.expressions)
          ),
          landmarks: faceDetections.landmarks,
          boundingBox: faceDetections.detection.box,
          confidence: faceDetections.detection.score,
        } : null,
        gestureDetection: gestureResults,
        timestamp: new Date(),
        duration: performance.now() - startTime,
      };

      // Emit results
      this.emit('analysisComplete', result);

      // Convert to emotional response if face detected
      if (result.faceDetection) {
        const emotionalResponse = this.convertToEmotionalResponse(result.faceDetection);
        this.emit('emotionalStateUpdated', emotionalResponse);
      }

      // Log performance metrics
      const duration = performance.now() - startTime;
      if (duration > 100) { // Log if processing takes more than 100ms
        await this.auditService.logEvent('video_analysis_performance', {
          duration,
          memoryInfo: tf.memory(),
          backend: tf.getBackend(),
          tensorCount: tf.memory().numTensors,
          fps: 1000 / duration
        });
      }
    } catch (error) {
      this.emit('error', {
        code: 'ANALYSIS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to perform video analysis',
      });
    } finally {
      // Clean up tensors
      if (input) input.dispose();
      
      // Periodically clean up memory
      if (Math.random() < 0.1) { // 10% chance to clean up on each frame
        tf.engine().endScope();
        tf.engine().startScope();
        
        // Force garbage collection if available
        if (globalThis.gc) {
          globalThis.gc();
        }
      }
    }
  }

  private convertToEmotionalResponse(faceDetection: FaceDetectionResult): EmotionalResponse {
    const { expressions } = faceDetection;
    
    // Find the dominant emotion
    const dominantEmotion = Object.entries(expressions)
      .reduce((max, [emotion, probability]) => 
        probability > max.probability ? { emotion, probability } : max,
        { emotion: 'neutral', probability: 0 }
      );

    // Convert expressions to EmotionProbabilities
    const probabilities: EmotionProbabilities = {
      joy: expressions.happy || 0,
      sadness: expressions.sad || 0,
      anger: expressions.angry || 0,
      fear: expressions.fearful || 0,
      neutral: expressions.neutral || 0,
    };

    return {
      primary: dominantEmotion.emotion as any,
      probabilities,
      intensity: dominantEmotion.probability,
      confidence: faceDetection.confidence,
      timestamp: new Date(),
    };
  }

  public async startVideoAnalysis(): Promise<void> {
    if (this.status === 'running') return;

    try {
      // Request video stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: this.config.width,
          height: this.config.height,
          facingMode: this.config.facingMode,
          frameRate: this.config.fps,
        },
      });

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      // Start analysis loop
      this.status = 'running';
      this.emit('statusChange', this.status);
      
      const analysisInterval = 1000 / this.config.fps;
      this.analysisInterval = setInterval(async () => {
        await this.performAnalysis();
      }, analysisInterval);

      await this.auditService.logEvent('video_analysis_started', {
        config: this.config,
      });
    } catch (error) {
      this.status = 'error';
      this.emit('statusChange', this.status);
      this.emit('error', {
        code: 'VIDEO_START_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start video analysis',
      });
      throw error;
    }
  }

  public async stopVideoAnalysis(): Promise<void> {
    if (this.status !== 'running') return;

    try {
      // Stop analysis loop
      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
        this.analysisInterval = null;
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Clean up video element
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      // Clean up MediaPipe
      await this.mediaPipeService.cleanup();

      this.status = 'idle';
      this.emit('statusChange', this.status);

      await this.auditService.logEvent('video_analysis_stopped', {
        config: this.config,
      });
    } catch (error) {
      this.emit('error', {
        code: 'VIDEO_STOP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to stop video analysis',
      });
      throw error;
    }
  }

  public getStatus(): VideoRecognitionStatus {
    return this.status;
  }
} 