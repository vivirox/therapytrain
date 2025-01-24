export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'video' | 'text' | 'interactive' | 'quiz';
  duration: number; // in minutes
  prerequisites?: string[]; // ids of required tutorials
  skills: string[]; // skills developed by this tutorial
  interactiveElements?: {
    type: 'roleplay' | 'decision-tree' | 'simulation';
    data: any;
  }[];
}

export interface Tutorial {
  type: string;
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'clinical-skills' | 'crisis-management' | 'therapeutic-techniques' | 'client-engagement';
  tags: string[];
  steps: TutorialStep[];
  estimatedDuration: number; // in minutes
  completionCriteria: {
    requiredSteps: string[]; // step ids that must be completed
    minimumScore?: number; // if there are assessments
    requiredPractice?: number; // minimum practice sessions
  };
}

export interface CaseStudy {
  id: string;
  title: string;
  description: string;
  clientProfile: {
    demographics: string;
    presentingIssues: string[];
    background: string;
    behavioralPatterns: string[];
  };
  therapeuticProcess: {
    approach: string;
    keyInterventions: string[];
    challenges: string[];
    outcomes: string[];
  };
  learningObjectives: string[];
  discussionQuestions: string[];
  expertInsights: string[];
  relatedResources: string[];
}

export interface SkillProgression {
  userId: string;
  skills: {
    [skillId: string]: {
      level: number;
      experience: number;
      completedTutorials: string[];
      completedCaseStudies: string[];
      practiceHours: number;
      strengths: string[];
      areasForImprovement: string[];
      nextSteps: string[];
    };
  };
  certifications: {
    id: string;
    name: string;
    dateEarned: Date;
    expiryDate?: Date;
    skills: string[];
  }[];
  learningPath: {
    currentGoals: string[];
    recommendedTutorials: string[];
    recommendedCaseStudies: string[];
    customizedFocus: string[];
  };
}

export interface LearningAnalytics {
  [x: string]: any[];
  userId: string;
  timeSpent: {
    tutorials: number;
    caseStudies: number;
    practice: number;
    total: number;
  };
  progress: {
    tutorialsCompleted: number;
    caseStudiesReviewed: number;
    skillsProgressed: number;
    certificationsEarned: number;
  };
  performance: {
    quizScores: number[];
    practiceEvaluations: number[];
    peerReviews: number[];
  };
  engagement: {
    lastActive: Date;
    weeklyActivity: number[];
    streakDays: number;
    contributionsCount: number;
  };
}
