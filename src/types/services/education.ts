import type { LearningPath } from './learningpath';
import type { TutorialPathway, TutorialStep } from './tutorialpathway';

export type { LearningPath };

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Tutorial extends TutorialStep {
    skillLevel: SkillLevel;
    prerequisites: string[];
    outcomes: string[];
}

export interface CaseStudy {
    id: string;
    title: string;
    description: string;
    skillLevel: SkillLevel;
    content: string;
    questions: {
        id: string;
        question: string;
        type: 'multiple_choice' | 'open_ended' | 'practical';
        options?: string[];
        correctAnswer?: string;
    }[];
    resources: string[];
    estimatedTime: number;
    metadata: Record<string, unknown>;
}
