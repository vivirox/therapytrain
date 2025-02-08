import { Tutorial, CaseStudy, SkillProgression } from '@/types/education';
interface UserBehavior {
    completedTutorials: Array<string>;
    viewedCaseStudies: Array<string>;
    interests: Array<string>;
    strugglingAreas: Array<string>;
    learningStyle: 'visual' | 'interactive' | 'reading';
    skillLevels: Record<string, number>;
}
interface RecommendationScore {
    itemId: string;
    score: number;
    reasons: Array<string>;
}
export class RecommendationEngine {
    private static readonly SKILL_WEIGHT = 0.4;
    private static readonly INTEREST_WEIGHT = 0.3;
    private static readonly LEARNING_STYLE_WEIGHT = 0.2;
    private static readonly POPULARITY_WEIGHT = 0.1;
    static async getUserBehavior(userId: string): Promise<UserBehavior> {
        try {
            const response = await fetch(`/api/user-behavior/${userId}`);
            if (!response.ok)
                throw new Error('Failed to fetch user behavior');
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching user behavior:', error);
            throw error;
        }
    }
    static async getPopularityMetrics(): Promise<Record<string, number>> {
        try {
            const response = await fetch('/api/content-popularity');
            if (!response.ok)
                throw new Error('Failed to fetch popularity metrics');
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching popularity metrics:', error);
            throw error;
        }
    }
    static calculateTutorialScore(tutorial: Tutorial, userBehavior: UserBehavior, popularityMetrics: Record<string, number>): RecommendationScore {
        const reasons: Array<string> = [];
        let score = 0;
        // Skill level appropriateness
        const skillScore = this.calculateSkillScore(tutorial, userBehavior);
        score += skillScore * this.SKILL_WEIGHT;
        if (skillScore > 0.7) {
            reasons.push('Matches your current skill level');
        }
        // Interest alignment
        const interestScore = this.calculateInterestScore(tutorial, userBehavior);
        score += interestScore * this.INTEREST_WEIGHT;
        if (interestScore > 0.7) {
            reasons.push('Aligns with your interests');
        }
        // Learning style match
        const styleScore = this.calculateLearningStyleScore(tutorial, userBehavior);
        score += styleScore * this.LEARNING_STYLE_WEIGHT;
        if (styleScore > 0.7) {
            reasons.push('Matches your learning style');
        }
        // Popularity
        const popularityScore = popularityMetrics[tutorial.id] || 0;
        score += popularityScore * this.POPULARITY_WEIGHT;
        if (popularityScore > 0.8) {
            reasons.push('Highly rated by other learners');
        }
        return {
            itemId: tutorial.id,
            score,
            reasons
        };
    }
    static calculateCaseStudyScore(caseStudy: CaseStudy, userBehavior: UserBehavior, popularityMetrics: Record<string, number>): RecommendationScore {
        const reasons: Array<string> = [];
        let score = 0;
        // Relevance to struggling areas
        const relevanceScore = this.calculateRelevanceScore(caseStudy, userBehavior);
        score += relevanceScore * this.SKILL_WEIGHT;
        if (relevanceScore > 0.7) {
            reasons.push('Addresses your current learning needs');
        }
        // Interest alignment
        const interestScore = this.calculateCaseInterestScore(caseStudy, userBehavior);
        score += interestScore * this.INTEREST_WEIGHT;
        if (interestScore > 0.7) {
            reasons.push('Covers topics you are interested in');
        }
        // Complexity appropriateness
        const complexityScore = this.calculateComplexityScore(caseStudy, userBehavior);
        score += complexityScore * this.LEARNING_STYLE_WEIGHT;
        if (complexityScore > 0.7) {
            reasons.push('Appropriate complexity level');
        }
        // Popularity
        const popularityScore = popularityMetrics[caseStudy.id] || 0;
        score += popularityScore * this.POPULARITY_WEIGHT;
        if (popularityScore > 0.8) {
            reasons.push('Well-reviewed by peers');
        }
        return {
            itemId: caseStudy.id,
            score,
            reasons
        };
    }
    private static calculateSkillScore(tutorial: Tutorial, userBehavior: UserBehavior): number {
        const requiredSkills = tutorial.steps.flatMap(step => step.skills);
        const skillScores = requiredSkills.map((skill: any ) => {
            const userLevel = userBehavior.skillLevels[skill] || 0;
            const tutorialLevel = this.getDifficultyLevel(tutorial.difficulty);
            return 1 - Math.abs(userLevel - tutorialLevel) / 10;
        });
        return skillScores.reduce((acc: any, score: any) => acc + score, 0) / skillScores.length;
    }
    private static calculateInterestScore(tutorial: Tutorial, userBehavior: UserBehavior): number {
        const matchingInterests = tutorial.tags.filter((tag: any) => userBehavior.interests.includes(tag));
        return matchingInterests.length / tutorial.tags.length;
    }
    private static calculateLearningStyleScore(tutorial: Tutorial, userBehavior: UserBehavior): number {
        const styleMatches = tutorial.steps.filter((step: any) => this.matchesLearningStyle(step.type, userBehavior.learningStyle));
        return styleMatches.length / tutorial.steps.length;
    }
    private static calculateRelevanceScore(caseStudy: CaseStudy, userBehavior: UserBehavior): number {
        const matchingIssues = caseStudy.clientProfile.presentingIssues.filter((issue: any) => userBehavior.strugglingAreas.includes(issue));
        return matchingIssues.length / caseStudy.clientProfile.presentingIssues.length;
    }
    private static calculateCaseInterestScore(caseStudy: CaseStudy, userBehavior: UserBehavior): number {
        const allTopics = [
            ...caseStudy.clientProfile.presentingIssues,
            caseStudy.therapeuticProcess.approach,
            ...caseStudy.therapeuticProcess.keyInterventions
        ];
        const matchingInterests = allTopics.filter((topic: any) => userBehavior.interests.includes(topic));
        return matchingInterests.length / allTopics.length;
    }
    private static calculateComplexityScore(caseStudy: CaseStudy, userBehavior: UserBehavior): number {
        const relevantSkills = caseStudy.learningObjectives.filter((objective: any) => Object.keys(userBehavior.skillLevels).includes(objective));
        const skillLevels = relevantSkills.map((skill: any) => userBehavior.skillLevels[skill] || 0);
        const averageSkillLevel = skillLevels.reduce((acc: any, level: any) => acc + level, 0) / skillLevels.length;
        return 1 - Math.abs(averageSkillLevel - 5) / 10; // Assuming ideal complexity is at skill level 5
    }
    private static getDifficultyLevel(difficulty: string): number {
        switch (difficulty) {
            case 'beginner':
                return 3;
            case 'intermediate':
                return 6;
            case 'advanced':
                return 9;
            default:
                return 5;
        }
    }
    private static matchesLearningStyle(contentType: string, userStyle: string): boolean {
        switch (userStyle) {
            case 'visual':
                return contentType === 'video';
            case 'interactive':
                return contentType === 'interactive' || contentType === 'quiz';
            case 'reading':
                return contentType === 'text';
            default:
                return false;
        }
    }
    static async getRecommendations(userId: string, tutorials: Array<Tutorial>, caseStudies: Array<CaseStudy>): Promise<{
        recommendedTutorials: Array<Tutorial & {
            reasons: Array<string>;
        }>;
        recommendedCaseStudies: Array<CaseStudy & {
            reasons: Array<string>;
        }>;
    }> {
        try {
            const [userBehavior, popularityMetrics] = await Promise.all([
                this.getUserBehavior(userId),
                this.getPopularityMetrics()
            ]);
            // Score and sort tutorials
            const tutorialScores = tutorials
                .filter((t: any) => !userBehavior.completedTutorials.includes(t.id))
                .map((tutorial: any) => ({
                tutorial,
                ...this.calculateTutorialScore(tutorial, userBehavior, popularityMetrics)
            }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
            // Score and sort case studies
            const caseStudyScores = caseStudies
                .filter((c: any) => !userBehavior.viewedCaseStudies.includes(c.id))
                .map((caseStudy: any) => ({
                caseStudy,
                ...this.calculateCaseStudyScore(caseStudy, userBehavior, popularityMetrics)
            }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
            return {
                recommendedTutorials: tutorialScores.map(({ tutorial, reasons }: any) => ({
                    ...tutorial,
                    reasons
                })),
                recommendedCaseStudies: caseStudyScores.map(({ caseStudy, reasons }: any) => ({
                    ...caseStudy,
                    reasons
                }))
            };
        }
        catch (error) {
            console.error('Error generating recommendations:', error);
            throw error;
        }
    }
    static async getRecommendedContent(userId: string) {
        try {
            const [tutorials, caseStudies] = await Promise.all([
                this.getRecommendedTutorials(userId),
                this.getRecommendedCaseStudies(userId)
            ]);
            return {
                recommendedTutorials: tutorials,
                recommendedCaseStudies: caseStudies
            };
        }
        catch (error) {
            console.error('Error getting recommended content:', error);
            return {
                recommendedTutorials: [],
                recommendedCaseStudies: []
            };
        }
    }
    static async getRecommendedTutorials(userId: string): Promise<Array<Tutorial>> {
        try {
            const response = await fetch(`/api/recommendations/tutorials/${userId}`);
            if (!response.ok)
                throw new Error('Failed to fetch recommended tutorials');
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching recommended tutorials:', error);
            return [];
        }
    }
    static async getRecommendedCaseStudies(userId: string): Promise<Array<CaseStudy>> {
        try {
            const response = await fetch(`/api/recommendations/case-studies/${userId}`);
            if (!response.ok)
                throw new Error('Failed to fetch recommended case studies');
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching recommended case studies:', error);
            return [];
        }
    }
}
