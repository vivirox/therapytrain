import {
  LearningPath,
  SkillLevel,
  Tutorial,
  CaseStudy,
} from "@/types/services/education";

export interface EducationService {
  getLearningPaths(): Promise<LearningPath[]>;
  getTutorials(skillLevel: SkillLevel): Promise<Tutorial[]>;
  getCaseStudies(): Promise<CaseStudy[]>;
  trackProgress(
    userId: string,
    tutorialId: string,
    progress: number,
  ): Promise<void>;
  getRecommendedPath(userId: string): Promise<LearningPath>;
  getSkillLevel(userId: string): Promise<SkillLevel>;
}

export interface EducationAnalytics {
  userId: string;
  completedTutorials: string[];
  completedCaseStudies: string[];
  currentSkillLevel: SkillLevel;
  learningPathProgress: Record<string, number>;
  timestamp: Date;
}

export interface EducationConfig {
  minProgressForCompletion: number;
  maxInactiveDays: number;
  requiredTutorialsPerLevel: number;
  requiredCaseStudiesPerLevel: number;
}

export * from "@/services/tutorialPathway";
export * from "@/services/learningPath";
