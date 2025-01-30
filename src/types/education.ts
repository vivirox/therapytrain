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
  type: string;
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'clinical-skills' | 'crisis-management' | 'therapeutic-techniques' | 'client-engagement';
  tags: Array<string>;
  steps: Array<TutorialStep>;
  estimatedDuration: number; // in minutes
  completionCriteria: {
    requiredSteps: Array<string>; // step ids that must be completed
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
    [skillId: string]: {
      level: number;
      experience: number;
      completedTutorials: Array<string>;
      completedCaseStudies: Array<string>;
      practiceHours: number;
      strengths: Array<string>;
      areasForImprovement: Array<string>;
      nextSteps: Array<string>;
    };
  };
  certifications: Array<{
    id: string;
    name: string;
    dateEarned: Date;
    expiryDate?: Date;
    skills: Array<string>;
  }>;
  learningPath: {
    currentGoals: Array<string>;
    recommendedTutorials: Array<string>;
    recommendedCaseStudies: Array<string>;
    customizedFocus: Array<string>;
  };
}

export interface LearningAnalytics {
  [x: string]: Array<any> | string | object;
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
    quizScores: Array<number>;
    practiceEvaluations: Array<number>;
    peerReviews: Array<number>;
  };
  engagement: {
    lastActive: Date;
    weeklyActivity: Array<number>;
    streakDays: number;
    contributionsCount: number;
  };
}
