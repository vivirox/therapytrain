export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'video' | 'text' | 'interactive' | 'quiz';
  duration: number; // in minutes
  prerequisites?: Array<string>; // ids of required tutorials
  skills: Array<string>; // skills developed by this tutorial
  interactiveElements?: Array<{
    type: 'roleplay' | 'decision-tree' | 'simulation';
    data: any;
  }>;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  type: 'core' | 'specialized' | 'advanced';
  estimatedDuration: number;
  steps: TutorialStep[];
  tags: string[];
  content: {
    sections: TutorialSection[];
    resources: Resource[];
    exercises: Exercise[];
  };
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
  };
}

export interface TutorialSection {
  id: string;
  title: string;
  content: string;
  order: number;
  resources?: Resource[];
  exercises?: Exercise[];
}

export interface Resource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'document' | 'link';
  url: string;
  description?: string;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'practice' | 'reflection';
  content: any;
  solution?: any;
}

export interface CaseStudy {
  id: string;
  title: string;
  description: string;
  clientProfile: {
    demographics: string;
    presentingIssues: Array<string>;
    background: string;
    behavioralPatterns: Array<string>;
  };
  therapeuticProcess: {
    approach: string;
    keyInterventions: Array<string>;
    challenges: Array<string>;
    outcomes: Array<string>;
  };
  learningObjectives: Array<string>;
  discussionQuestions: Array<string>;
  expertInsights: Array<string>;
  relatedResources: Array<string>;
}

export interface SkillProgression {
  userId: string;
  skills: {
    [key: string]: {
      level: number;
      progress: number;
      completedExercises: string[];
      achievements: string[];
      experience: number;
      practiceHours: number;
      strengths: string[];
      areasForImprovement: string[];
      completedTutorials: string[];
      completedCaseStudies: string[];
      nextSteps: string[];
      certifications: string[];
    };
  };
  completedTutorials: string[];
  currentTutorial?: {
    id: string;
    progress: number;
    lastAccessed: string;
  };
  learningPath: {
    currentGoals: string[];
    completedGoals: string[];
    recommendedTutorials: string[];
    recommendedCaseStudies: string[];
    focusAreas: string[];
  };
}

export interface LearningAnalytics {
  userId: string;
  timeSpent: number;
  progress: {
    completed: number;
    total: number;
  };
  performance: {
    exercises: {
      attempted: number;
      completed: number;
      accuracy: number;
    };
    quizzes: {
      average: number;
      best: number;
      completed: number;
    };
  };
  engagement: {
    lastActive: string;
    sessionsCompleted: number;
    averageSessionDuration: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
}

export interface LearningPath {
  id: string;
  userId: string;
  currentGoals: string[];
  completedGoals: string[];
  recommendedTutorials: string[];
  recommendedCaseStudies: string[];
  focusAreas: string[];
  customizedFocus?: string[];
  progress: number;
  lastUpdated: Date;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
