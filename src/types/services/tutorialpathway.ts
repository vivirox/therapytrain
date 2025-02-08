import type { LearningNode, PathProgress } from './learningpath';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'text' | 'interactive' | 'quiz';
  duration: number;
  requirements: string[];
  learningNode: LearningNode;
  metadata: Record<string, unknown>;
}

export interface TutorialSection {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  optional: boolean;
  difficulty: number;
  estimatedTime: number;
}

export interface TutorialPathway {
  id: string;
  userId: string;
  title: string;
  description: string;
  sections: TutorialSection[];
  currentSection: string;
  currentStep: string;
  progress: Record<string, PathProgress>;
  startDate: Date;
  lastAccessed: Date;
  completed: boolean;
}

export interface TutorialInteraction {
  userId: string;
  pathwayId: string;
  stepId: string;
  type: 'view' | 'complete' | 'skip' | 'repeat' | 'help';
  timestamp: Date;
  duration: number;
  metadata: Record<string, unknown>;
}

export interface TutorialPathwayService {
  createPathway(userId: string, preferences: Record<string, unknown>): Promise<TutorialPathway>;
  updateProgress(userId: string, stepId: string, progress: PathProgress): Promise<void>;
  getNextStep(userId: string): Promise<TutorialStep>;
  trackInteraction(interaction: TutorialInteraction): Promise<void>;
  getPathwayMetrics(userId: string): Promise<{
    completionRate: number;
    timeSpent: number;
    problemAreas: string[];
    engagement: number;
  }>;
}

export interface TutorialPathwayConfig {
  adaptToSkillLevel: boolean;
  includeAssessments: boolean;
  maxSectionSize: number;
  minCompletionRate: number;
  enableInteractiveElements: boolean;
} 