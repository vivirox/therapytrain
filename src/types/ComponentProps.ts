import { ReactNode } from 'react';
import { ClientProfile, ClientSession, Message, Intervention } from './ClientProfile';

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface AuthProviderProps extends BaseProps {
  children: ReactNode;
}

export interface InterventionTrackerProps extends BaseProps {
  sessionId: string;
  onEffectivenessUpdate: (effectiveness: number) => void;
}

export interface PeerReviewProps extends BaseProps {
  sessionId: string;
  therapistId: string;
  onSubmitReview: (review: {
    rating: number;
    feedback: string;
    areas: string[];
  }) => void;
}

export interface SessionAnalysisProps extends BaseProps {
  sessionId: string;
  onGenerateReport: (report: {
    summary: string;
    recommendations: string[];
    metrics: {
      effectiveness: number;
      engagement: number;
      progress: number;
    };
  }) => void;
}

export interface DialogHeaderProps extends BaseProps {
  children: ReactNode;
}

export interface DialogFooterProps extends BaseProps {
  children: ReactNode;
}

export interface AlertDialogProps extends BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export interface AlertDialogHeaderProps extends BaseProps {
  children: ReactNode;
}

export interface AlertDialogFooterProps extends BaseProps {
  children: ReactNode;
}

export interface ErrorFallbackProps extends BaseProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export interface SkillProgressionTrackerProps extends BaseProps {
  userId: string;
}

export interface LearningPathViewProps extends BaseProps {
  userId: string;
  specialization: string;
  initialSkillLevels: Record<string, number>;
}

export interface TutorialCardProps extends BaseProps {
  tutorial: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    duration: string;
    prerequisites?: string[];
  };
  progress: boolean;
  onClick: () => void;
}

export interface CaseStudyLibraryProps extends BaseProps {
  userId: string;
  recommendedCases: Array<{
    id: string;
    title: string;
    description: string;
    complexity: string;
    topics: string[];
    learningObjectives: string[];
  }>;
} 