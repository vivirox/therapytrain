import { EmotionalResponse } from './emotions';

export interface ModelLayer {
  type: string;
  units?: number;
  activation?: string;
  dropoutRate?: number;
  filters?: number;
  kernelSize?: number[];
  strides?: number[];
  padding?: string;
}

export interface ModelArchitecture {
  id: string;
  layers: ModelLayer[];
  inputShape: number[];
  outputShape: number[];
  hyperparameters: {
    learningRate: number;
    batchSize: number;
    optimizer: string;
    lossFunction: string;
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: string;
    description: string;
  };
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  latency: number;
  memoryUsage: number;
  convergenceRate?: number;
  lossHistory: number[];
  privacyScore: number;
  robustnessScore: number;
  timestamp: number;
}

export interface TrainingConfig {
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  privacyBudget: number;
  noiseMultiplier: number;
  clipNorm: number;
  secureAggregationConfig: {
    threshold: number;
    minParticipants: number;
    timeoutSeconds: number;
  };
  federatedConfig: {
    roundsPerEpoch: number;
    minClientsPerRound: number;
    clientSamplingRate: number;
    clientUpdateEpochs: number;
  };
}

export interface ModelPrediction {
  modelId: string;
  prediction: EmotionalResponse;
  confidence: number;
  latency: number;
  timestamp: number;
}

export interface ModelUpdate {
  modelId: string;
  gradients: Float32Array;
  metrics: ModelMetrics;
  clientId: string;
  round: number;
  timestamp: number;
}

export interface ArchitectureSearchResult {
  architecture: ModelArchitecture;
  metrics: ModelMetrics;
  searchStats: {
    totalTrials: number;
    bestTrialIndex: number;
    searchDuration: number;
    resourceUsage: {
      peakMemory: number;
      totalComputeTime: number;
    };
  };
}

export interface OnlineLearningStats {
  modelId: string;
  samplesProcessed: number;
  updateCount: number;
  recentAccuracy: number;
  driftDetected: boolean;
  adaptationRate: number;
  lastUpdateTimestamp: number;
} 