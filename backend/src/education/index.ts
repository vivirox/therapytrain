export interface LearningPath {
    id: string;
    title: string;
    description: string;
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    prerequisites: string[];
    skills: Skill[];
    milestones: Milestone[];
    metadata?: {
        estimatedDuration: number;
        tags: string[];
        category: string;
        author: string;
        lastUpdated: Date;
    };
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    level: number;
    category: string;
    prerequisites: string[];
    tutorials: Tutorial[];
    assessments: Assessment[];
    metadata?: {
        importance: number;
        difficulty: number;
        timeToMaster: number;
    };
}

export interface Tutorial {
    id: string;
    title: string;
    content: string;
    format: 'TEXT' | 'VIDEO' | 'INTERACTIVE';
    duration: number;
    skillId: string;
    steps: TutorialStep[];
    resources: Resource[];
    metadata?: {
        author: string;
        lastUpdated: Date;
        views: number;
        rating: number;
    };
}

export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    order: number;
    type: 'INSTRUCTION' | 'EXAMPLE' | 'EXERCISE' | 'QUIZ';
    completion: {
        required: boolean;
        criteria: string[];
        validation?: string;
    };
}

export interface Assessment {
    id: string;
    skillId: string;
    title: string;
    description: string;
    type: 'QUIZ' | 'PRACTICAL' | 'PROJECT';
    questions: Question[];
    passingScore: number;
    metadata?: {
        timeLimit: number;
        attempts: number;
        difficulty: number;
    };
}

export interface Question {
    id: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';
    content: string;
    options?: string[];
    correctAnswer: string | string[];
    points: number;
    explanation?: string;
}

export interface Milestone {
    id: string;
    title: string;
    description: string;
    requiredSkills: string[];
    criteria: {
        type: 'SKILL_LEVEL' | 'ASSESSMENT_SCORE' | 'COMPLETION';
        value: number;
        skill?: string;
    }[];
    rewards?: {
        type: 'BADGE' | 'CERTIFICATE' | 'POINTS';
        value: string | number;
    }[];
}

export interface Resource {
    id: string;
    title: string;
    type: 'ARTICLE' | 'VIDEO' | 'BOOK' | 'TOOL';
    url: string;
    description: string;
    metadata?: {
        author: string;
        publishDate: Date;
        difficulty: number;
        rating: number;
    };
}

export interface Progress {
    userId: string;
    pathId: string;
    startDate: Date;
    lastActivity: Date;
    completedSkills: {
        skillId: string;
        level: number;
        completedAt: Date;
    }[];
    completedTutorials: {
        tutorialId: string;
        completedAt: Date;
        score?: number;
    }[];
    assessmentResults: {
        assessmentId: string;
        score: number;
        completedAt: Date;
        attempts: number;
    }[];
    earnedMilestones: {
        milestoneId: string;
        earnedAt: Date;
        criteria: string[];
    }[];
}

// Re-export education-related implementations
export * from './pathManager';
export * from './skillTracker';
export * from './assessmentEngine';
export * from './progressTracker'; 