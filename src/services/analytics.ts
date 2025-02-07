import { LearningAnalytics, SkillGrowth } from "@/types/common";
import { Tutorial, SkillProgression } from "@/types/education";
import { SessionMetrics, ClientProgress, TherapistStats } from '@/types/api';
import { supabase } from '@/lib/supabase';
interface AnalyticsEvent {
    userId: string;
    eventType: string;
    timestamp: Date;
    metadata: Record<string, any>;
}
interface LearningMetrics {
    completionRate: number;
    averageScore: number;
    timeSpent: number;
    strengthAreas: string[];
    improvementAreas: string[];
    learningTrends: Array<{
        date: Date;
        metric: string;
        value: number;
    }>;
}
interface LearningAnalytics {
    metrics: {
        skillGrowth: SkillGrowth[];
        completionRate: number;
        averageScore: number;
        timeInvested: number;
        learningVelocity: number;
    };
    strengths: string[];
    areasForImprovement: string[];
    patterns: Array<{
        pattern: string;
        description: string;
        significance: number;
    }>;
    recommendations: string[];
}
export class AnalyticsService {
    private static readonly ANALYTICS_ENDPOINT = '/api/analytics';
    private static readonly METRICS_ENDPOINT = '/api/learning-metrics';
    private static readonly GROWTH_ENDPOINT = '/api/skill-growth';
    static async trackEvent(event: AnalyticsEvent): Promise<void> {
        try {
            await fetch(this.ANALYTICS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
        }
        catch (error) {
            console.error('Error tracking analytics event:', error);
        }
    }
    static async getLearningMetrics(userId: string): Promise<LearningMetrics> {
        try {
            const response = await fetch(`${this.METRICS_ENDPOINT}/${userId}`);
            if (!response.ok)
                throw new Error('Failed to fetch learning metrics');
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching learning metrics:', error);
            throw error;
        }
    }
    static async getSkillGrowth(userId: string, skillId: string): Promise<SkillGrowth> {
        try {
            const response = await fetch(`${this.GROWTH_ENDPOINT}/${userId}/skills/${skillId}`);
            if (!response.ok)
                throw new Error('Failed to fetch skill growth data');
            return await response.json();
        }
        catch (error) {
            console.error('Error fetching skill growth:', error);
            throw error;
        }
    }
    static async generateLearningInsights(userId: string): Promise<LearningAnalytics> {
        try {
            const [metrics, skills] = await Promise.all([
                this.getLearningMetrics(userId),
                fetch(`/api/users/${userId}/skills`).then(res => res.json())
            ]);
            const skillGrowthPromises = skills.map((skill: {
                id: string;
            }) => this.getSkillGrowth(userId, skill.id));
            const skillGrowthData = await Promise.all(skillGrowthPromises);
            // Calculate learning velocity
            const learningVelocity = this.calculateLearningVelocity(metrics.learningTrends);
            // Identify learning patterns
            const patterns = this.identifyLearningPatterns(metrics.learningTrends);
            // Generate personalized recommendations
            const recommendations = this.generateRecommendations(metrics, skillGrowthData, patterns);
            return {
                metrics: {
                    completionRate: metrics.completionRate,
                    averageScore: metrics.averageScore,
                    timeInvested: metrics.timeSpent,
                    learningVelocity
                },
                strengths: metrics.strengthAreas,
                areasForImprovement: metrics.improvementAreas,
                patterns,
                recommendations,
                skillGrowth: skillGrowthData.map((growth: SkillGrowth) => ({
                    skillId: growth.skillId,
                    growth: growth.growthRate,
                    recentMilestones: growth.milestones.slice(-3)
                }))
            };
        }
        catch (error) {
            console.error('Error generating learning insights:', error);
            throw error;
        }
    }
    private static calculateLearningVelocity(trends: Array<{
        date: Date;
        metric: string;
        value: number;
    }>): number {
        // Calculate the rate of improvement over time
        const sortedTrends = trends
            .filter((t: any) => t.metric === 'skillLevel')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (sortedTrends.length < 2)
            return 0;
        const timeSpan = new Date(sortedTrends[sortedTrends.length - 1].date).getTime() -
            new Date(sortedTrends[0].date).getTime();
        const improvement = sortedTrends[sortedTrends.length - 1].value - sortedTrends[0].value;
        return (improvement / timeSpan) * 1000 * 60 * 60 * 24; // Points per day
    }
    private static identifyLearningPatterns(trends: Array<{
        date: Date;
        metric: string;
        value: number;
    }>): Array<{
        pattern: string;
        description: string;
        significance: number;
    }> {
        const patterns = [];
        // Time-based patterns
        const timePatterns = this.analyzeTimingPatterns(trends);
        patterns.push(...timePatterns);
        // Performance patterns
        const performancePatterns = this.analyzePerformancePatterns(trends);
        patterns.push(...performancePatterns);
        // Engagement patterns
        const engagementPatterns = this.analyzeEngagementPatterns(trends);
        patterns.push(...engagementPatterns);
        return patterns.sort((a: { significance: number }, b: { significance: number }) => b.significance - a.significance);
    }
    private static analyzeTimingPatterns(trends: Array<{
        date: Date;
        metric: string;
        value: number;
    }>) {
        const patterns = [];
        const timeOfDayData = trends.map((t: any) => ({
            hour: new Date(t.date).getHours(),
            value: t.value
        }));
        // Find optimal learning times
        const hourlyAverages = new Array(24).fill(0).map((_: any, hour: any) => {
            const hourData = timeOfDayData.filter((d: any) => d.hour === hour);
            return {
                hour,
                average: hourData.reduce((sum: any, d: any) => sum + d.value, 0) / (hourData.length || 1)
            };
        });
        const bestHours = hourlyAverages
            .sort((a, b) => b.average - a.average)
            .slice(0, 3);
        patterns.push({
            pattern: 'Peak Learning Hours',
            description: `You show best performance during: ${bestHours
                .map((h: any) => `${h.hour}:00`)
                .join(', ')}`,
            significance: 0.8
        });
        return patterns;
    }
    private static analyzePerformancePatterns(trends: Array<{
        date: Date;
        metric: string;
        value: number;
    }>) {
        const patterns = [];
        const performanceTrends = trends.filter((t: any) => t.metric === 'score');
        if (performanceTrends.length < 2)
            return patterns;
        // Calculate overall trend
        const firstScore = performanceTrends[0].value;
        const lastScore = performanceTrends[performanceTrends.length - 1].value;
        const improvement = ((lastScore - firstScore) / firstScore) * 100;
        if (Math.abs(improvement) > 10) {
            patterns.push({
                pattern: improvement > 0 ? 'Consistent Improvement' : 'Performance Challenge',
                description: improvement > 0
                    ? `You've shown ${improvement.toFixed(1)}% improvement over time`
                    : 'You might benefit from reviewing fundamentals',
                significance: 0.9
            });
        }
        return patterns;
    }
    private static analyzeEngagementPatterns(trends: Array<{
        date: Date;
        metric: string;
        value: number;
    }>) {
        const patterns = [];
        const engagementTrends = trends.filter((t: any) => t.metric === 'timeSpent');
        if (engagementTrends.length < 7)
            return patterns;
        // Calculate weekly engagement
        const weeklyEngagement = engagementTrends.reduce((acc: any, curr: any) => {
            const day = new Date(curr.date).getDay();
            acc[day] = (acc[day] || 0) + curr.value;
            return acc;
        }, {} as Record<number, number>);
        const mostEngagedDay = Object.entries(weeklyEngagement).sort(([, a], [, b]) => b - a)[0];
        patterns.push({
            pattern: 'Engagement Pattern',
            description: `You're most engaged on ${this.getDayName(Number(mostEngagedDay[0]))}s`,
            significance: 0.7
        });
        return patterns;
    }
    private static getDayName(day: number): string {
        return [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ][day];
    }
    private static generateRecommendations(metrics: LearningMetrics, skillGrowth: SkillGrowth[], patterns: Array<{
        pattern: string;
        description: string;
        significance: number;
    }>): string[] {
        const recommendations = [];
        // Completion rate recommendations
        if (metrics.completionRate < 0.7) {
            recommendations.push('Consider breaking down learning sessions into smaller, more manageable chunks');
        }
        // Score-based recommendations
        if (metrics.averageScore < 0.8) {
            recommendations.push('Review feedback from completed exercises to identify areas needing more focus');
        }
        // Time management recommendations
        const timePattern = patterns.find(p => p.pattern === 'Peak Learning Hours');
        if (timePattern) {
            recommendations.push(`Schedule important learning sessions during your peak hours: ${timePattern.description.split(':')[1]}`);
        }
        // Skill growth recommendations
        const slowGrowthSkills = skillGrowth.filter((s: any) => s.growthRate < 0.5);
        if (slowGrowthSkills.length > 0) {
            recommendations.push('Consider seeking peer support or additional resources for challenging skills');
        }
        return recommendations;
    }
    // Event tracking helpers
    static trackTutorialProgress(userId: string, tutorialId: string, progress: number): void {
        this.trackEvent({
            userId,
            eventType: 'tutorial_progress',
            timestamp: new Date(),
            metadata: { tutorialId, progress }
        });
    }
    static trackQuizCompletion(userId: string, quizId: string, score: number, timeSpent: number): void {
        this.trackEvent({
            userId,
            eventType: 'quiz_completion',
            timestamp: new Date(),
            metadata: { quizId, score, timeSpent }
        });
    }
    static trackResourceEngagement(userId: string, resourceId: string, resourceType: string, engagementType: string): void {
        this.trackEvent({
            userId,
            eventType: 'resource_engagement',
            timestamp: new Date(),
            metadata: { resourceId, resourceType, engagementType }
        });
    }
    static trackPeerInteraction(userId: string, interactionType: string, targetId: string): void {
        this.trackEvent({
            userId,
            eventType: 'peer_interaction',
            timestamp: new Date(),
            metadata: { interactionType, targetId }
        });
    }
    async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
        try {
            const { data, error } = await supabase
                .from('session_metrics')
                .select('*')
                .eq('session_id', sessionId)
                .single();
            if (error)
                throw error;
            return {
                duration: data.duration,
                engagement: data.engagement_score,
                progress: data.progress_score,
                interventions: data.intervention_count,
                riskLevel: data.risk_level,
                goals: {
                    set: data.goals_set,
                    achieved: data.goals_achieved
                }
            };
        }
        catch (error) {
            console.error('Error fetching session metrics:', error);
            throw new Error('Failed to fetch session metrics');
        }
    }
    async getClientProgress(clientId: string): Promise<ClientProgress> {
        try {
            const { data: progressData, error: progressError } = await supabase
                .from('client_progress')
                .select('*')
                .eq('client_id', clientId)
                .single();
            if (progressError)
                throw progressError;
            const { data: goalsData, error: goalsError } = await supabase
                .from('client_goals')
                .select('*')
                .eq('client_id', clientId);
            if (goalsError)
                throw goalsError;
            return {
                overallProgress: progressData.overall_progress,
                goalCompletion: {
                    completed: progressData.completed_goals,
                    total: progressData.total_goals,
                    goals: goalsData.map((goal: any) => ({
                        id: goal.id,
                        description: goal.description,
                        progress: goal.progress,
                        status: goal.status
                    }))
                },
                sessionMetrics: {
                    total: progressData.total_sessions,
                    completed: progressData.completed_sessions,
                    averageDuration: progressData.average_duration,
                    averageEngagement: progressData.average_engagement
                }
            };
        }
        catch (error) {
            console.error('Error fetching client progress:', error);
            throw new Error('Failed to fetch client progress');
        }
    }
    async getTherapistStats(therapistId: string): Promise<TherapistStats> {
        try {
            const { data, error } = await supabase
                .from('therapist_stats')
                .select('*')
                .eq('therapist_id', therapistId)
                .single();
            if (error)
                throw error;
            return {
                activeClients: data.active_clients,
                totalSessions: data.total_sessions,
                averageSessionDuration: data.average_session_duration,
                clientSatisfaction: data.client_satisfaction,
                successRate: data.success_rate,
                specialties: data.specialties,
                availability: {
                    hours: data.available_hours,
                    slots: data.available_slots
                },
                certifications: {
                    active: data.active_certifications,
                    pending: data.pending_certifications
                }
            };
        }
        catch (error) {
            console.error('Error fetching therapist stats:', error);
            throw new Error('Failed to fetch therapist stats');
        }
    }
    async subscribeToSessionAnalytics(sessionId: string, callback: (payload: any) => void): Promise<void> {
        const subscription = supabase
            .channel('analytics')
            .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'session_analytics',
            filter: `session_id=eq.${sessionId}`
        }, (payload: any) => callback(payload));
        // Handle cleanup when the component unmounts
        subscription.on('error', () => {
            console.error('Error subscribing to session analytics');
        });
        subscription.on('close', () => {
            console.log('Session analytics subscription closed');
        });
    }
}
export const analyticsService = new AnalyticsService();
