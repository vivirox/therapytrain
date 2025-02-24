export interface LearningNode {
  id: string;
  title: string;
  description: string;
  type: 'concept' | 'exercise' | 'assessment' | 'resource';
  prerequisites: string[];
  outcomes: string[];
  difficulty: number;
  estimatedTime: number;
  metadata: Record<string, unknown>;
}

export interface LearningEdge {
  from: string;
  to: string;
  type: 'requires' | 'suggests' | 'enhances';
  weight: number;
  metadata: Record<string, unknown>;
}

export interface LearningPath {
  id: string;
  userId: string;
  nodes: LearningNode[];
  edges: LearningEdge[];
  currentNode: string;
  completedNodes: string[];
  progress: number;
  startDate: Date;
  lastUpdated: Date;
}

export interface PathProgress {
  nodeId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'struggling';
  startTime?: Date;
  completionTime?: Date;
  attempts: number;
  score?: number;
  feedback?: string;
}

export interface LearningPathService {
  createPath(userId: string, goals: string[]): Promise<LearningPath>;
  updateProgress(userId: string, nodeId: string, progress: PathProgress): Promise<void>;
  getNextNodes(userId: string): Promise<LearningNode[]>;
  suggestAlternativePath(userId: string): Promise<LearningPath>;
  getPathMetrics(userId: string): Promise<{
    completionRate: number;
    averageTime: number;
    strugglingNodes: string[];
    mastery: Record<string, number>;
  }>;
}

export interface LearningPathConfig {
  maxPathLength: number;
  minNodeCompletion: number;
  adaptationThreshold: number;
  difficultyLevels: number;
  enableDynamicPathing: boolean;
} 