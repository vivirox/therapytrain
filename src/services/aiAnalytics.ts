import { LearningAnalytics } from "@/types/education";
import { AnalyticsService } from "./analytics";
interface AIInsight {
    type: 'strength' | 'weakness' | 'pattern' | 'recommendation';
    confidence: number;
    description: string;
    evidence: string[];
    actionItems: string[];
}
interface LearningStyle {
    visual: number;
    auditory: number;
    kinesthetic: number;
    reading: number;
    social: number;
    solitary: number;
}
interface CognitiveDomain {
    knowledge: number;
    comprehension: number;
    application: number;
    analysis: number;
    synthesis: number;
    evaluation: number;
}
interface EmotionalIntelligence {
    selfAwareness: number;
    empathy: number;
    regulation: number;
    socialSkills: number;
    motivation: number;
}
interface TherapeuticCompetency {
    assessment: number;
    intervention: number;
    relationship: number;
    ethics: number;
    cultural: number;
    documentation: number;
}
interface AIAnalytics {
    learningStyle: LearningStyle;
    cognitiveDomain: CognitiveDomain;
    emotionalIntelligence: EmotionalIntelligence;
    therapeuticCompetency: TherapeuticCompetency;
    insights: AIInsight[];
    predictedGrowthAreas: string[];
    recommendedPathways: Array<{
        name: string;
        description: string;
        estimatedTimeToMastery: number;
        milestones: string[];
    }>;
}
export class AIAnalyticsService {
    private static readonly AI_ENDPOINT = '/api/ai-analytics';
    static async generateAIInsights(userId: string): Promise<AIAnalytics> {
        try {
            // Fetch all necessary data
            const [learningMetrics, skillGrowth, tutorialHistory, caseStudyInteractions, peerInteractions, assessmentResults] = await Promise.all([
                AnalyticsService.getLearningMetrics(userId),
                fetch(`/api/users/${userId}/skill-growth`).then(res => res.json()),
                fetch(`/api/users/${userId}/tutorial-history`).then(res => res.json()),
                fetch(`/api/users/${userId}/case-study-interactions`).then(res => res.json()),
                fetch(`/api/users/${userId}/peer-interactions`).then(res => res.json()),
                fetch(`/api/users/${userId}/assessment-results`).then(res => res.json())
            ]);
            // Process data through AI models
            const aiAnalysis = await this.processWithAI({
                learningMetrics,
                skillGrowth,
                tutorialHistory,
                caseStudyInteractions,
                peerInteractions,
                assessmentResults
            });
            return aiAnalysis;
        }
        catch (error) {
            console.error('Error generating AI insights:', error);
            throw error;
        }
    }
    private static async processWithAI(data: any): Promise<AIAnalytics> {
        const response = await fetch(this.AI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Failed to process data with AI');
        }
        return await response.json();
    }
    static async generatePersonalizedCurriculum(userId: string, targetCompetencies: string[]): Promise<Array<{
        module: string;
        resources: Array<{
            type: string;
            id: string;
            rationale: string;
            priority: number;
        }>;
        estimatedDuration: number;
        prerequisites: string[];
    }>> {
        try {
            const aiAnalytics = await this.generateAIInsights(userId);
            const response = await fetch(`${this.AI_ENDPOINT}/curriculum`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analytics: aiAnalytics,
                    targetCompetencies
                })
            });
            if (!response.ok) {
                throw new Error('Failed to generate personalized curriculum');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error generating personalized curriculum:', error);
            throw error;
        }
    }
    static async predictLearningChallenges(userId: string, upcomingContent: any[]): Promise<Array<{
        contentId: string;
        potentialChallenges: string[];
        preparatoryRecommendations: string[];
        confidenceScore: number;
    }>> {
        try {
            const aiAnalytics = await this.generateAIInsights(userId);
            const response = await fetch(`${this.AI_ENDPOINT}/predict-challenges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analytics: aiAnalytics,
                    upcomingContent
                })
            });
            if (!response.ok) {
                throw new Error('Failed to predict learning challenges');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error predicting learning challenges:', error);
            throw error;
        }
    }
    static async generateSkillGapAnalysis(userId: string, targetRole: string): Promise<{
        currentLevel: Record<string, number>;
        targetLevel: Record<string, number>;
        gaps: Array<{
            skill: string;
            currentLevel: number;
            targetLevel: number;
            priority: number;
            recommendedResources: string[];
        }>;
        estimatedTimeToTarget: number;
    }> {
        try {
            const aiAnalytics = await this.generateAIInsights(userId);
            const response = await fetch(`${this.AI_ENDPOINT}/skill-gap-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analytics: aiAnalytics,
                    targetRole
                })
            });
            if (!response.ok) {
                throw new Error('Failed to generate skill gap analysis');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error generating skill gap analysis:', error);
            throw error;
        }
    }
    static async generatePeerMatchRecommendations(userId: string): Promise<Array<{
        peerId: string;
        compatibilityScore: number;
        complementaryStrengths: string[];
        sharedInterests: string[];
        recommendedActivities: string[];
    }>> {
        try {
            const [userAnalytics, peerPool] = await Promise.all([
                this.generateAIInsights(userId),
                fetch('/api/peer-pool').then(res => res.json())
            ]);
            const response = await fetch(`${this.AI_ENDPOINT}/peer-matching`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAnalytics,
                    peerPool
                })
            });
            if (!response.ok) {
                throw new Error('Failed to generate peer match recommendations');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error generating peer match recommendations:', error);
            throw error;
        }
    }
    static async generateAdaptiveFeedback(userId: string, performance: any): Promise<{
        feedback: string;
        areas: Array<{
            name: string;
            strength: boolean;
            feedback: string;
            suggestedResources: string[];
        }>;
        nextSteps: string[];
        confidenceLevel: number;
    }> {
        try {
            const aiAnalytics = await this.generateAIInsights(userId);
            const response = await fetch(`${this.AI_ENDPOINT}/adaptive-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analytics: aiAnalytics,
                    performance
                })
            });
            if (!response.ok) {
                throw new Error('Failed to generate adaptive feedback');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error generating adaptive feedback:', error);
            throw error;
        }
    }
    // Helper methods for processing specific aspects of learning
    static async analyzeLearningStyle(userId: string, recentActivities: any[]): Promise<{
        dominantStyle: string;
        styleBreakdown: LearningStyle;
        recommendations: string[];
    }> {
        try {
            const response = await fetch(`${this.AI_ENDPOINT}/learning-style`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, recentActivities })
            });
            if (!response.ok) {
                throw new Error('Failed to analyze learning style');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error analyzing learning style:', error);
            throw error;
        }
    }
    static async analyzeCognitiveDevelopment(userId: string, assessmentData: any): Promise<{
        domains: CognitiveDomain;
        strengths: string[];
        areasForImprovement: string[];
        recommendations: string[];
    }> {
        try {
            const response = await fetch(`${this.AI_ENDPOINT}/cognitive-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, assessmentData })
            });
            if (!response.ok) {
                throw new Error('Failed to analyze cognitive development');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error analyzing cognitive development:', error);
            throw error;
        }
    }
    static async analyzeEmotionalIntelligence(userId: string, interactionData: any): Promise<{
        metrics: EmotionalIntelligence;
        insights: string[];
        developmentPlan: string[];
    }> {
        try {
            const response = await fetch(`${this.AI_ENDPOINT}/ei-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, interactionData })
            });
            if (!response.ok) {
                throw new Error('Failed to analyze emotional intelligence');
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error analyzing emotional intelligence:', error);
            throw error;
        }
    }
}
