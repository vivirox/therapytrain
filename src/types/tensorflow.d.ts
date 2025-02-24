declare module '@tensorflow/tfjs' {
  export interface Tensor {
    dispose(): void;
  }

  export interface Memory {
    numBytes: number;
    numTensors: number;
    numDataBuffers: number;
    unreliable?: boolean;
  }

  export interface Backend {
    getGPGPUContext(): {
      gl: WebGLRenderingContext;
    };
  }

  export interface Environment {
    get(feature: string): number;
    set(feature: string, value: boolean | number): Promise<void>;
  }

  export interface Engine {
    startScope(): void;
    endScope(): void;
    registerTensor: (tensor: Tensor) => Tensor;
  }

  export function engine(): Engine;
  export function memory(): Memory;
  export function ready(): Promise<void>;
  export function getBackend(): string;
  export function setBackend(backendName: string): Promise<boolean>;
  export function env(): Environment;
  export function backend(): Backend;
  
  export function tidy<T>(
    nameOrFn: string | (() => T),
    fn?: () => T
  ): T;

  export function cast<T extends Tensor>(
    x: T | TensorLike,
    dtype: DataType
  ): T;

  export type DataType = 'float32' | 'int32' | 'bool' | 'complex64' | 'string' | 'float16';
  export type TensorLike = number | number[] | number[][] | number[][][] | number[][][][];

  export namespace browser {
    export function fromPixels(
      pixels: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    ): Tensor;
  }

  export function div(a: Tensor, b: Tensor | number): Tensor;
  export function sub(a: Tensor, b: Tensor | number): Tensor;
}

declare module 'face-api.js' {
  export interface FaceDetection {
    score: number;
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  export interface FaceLandmarks68 {
    positions: Array<{ x: number; y: number }>;
    shift: { x: number; y: number };
  }

  export interface FaceExpressions {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  }

  export interface WithFaceDetection<T = {}> {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks<T = {}> extends WithFaceDetection<T> {
    landmarks: FaceLandmarks68;
  }

  export interface WithFaceExpressions<T = {}> extends WithFaceDetection<T> {
    expressions: FaceExpressions;
  }

  export interface FaceDetectionNet {
    load(modelPath: string): Promise<this>;
  }

  export interface FaceExpressionNet {
    load(modelPath: string): Promise<this>;
  }

  export interface FaceLandmark68Net {
    load(modelPath: string): Promise<this>;
  }

  export class TinyFaceDetectorOptions {
    constructor(options?: { inputSize?: number; scoreThreshold?: number });
  }

  export type FaceDetectResult<T = {}> = Promise<WithFaceDetection<T> & WithFaceLandmarks<T> & WithFaceExpressions<T>>;

  export function detectSingleFace(
    input: tf.Tensor | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    options: TinyFaceDetectorOptions
  ): {
    withFaceLandmarks(): {
      withFaceExpressions(): FaceDetectResult;
    };
  };

  export const nets: {
    tinyFaceDetector: FaceDetectionNet;
    faceExpressionNet: FaceExpressionNet;
    faceLandmark68Net: FaceLandmark68Net;
  };
} 