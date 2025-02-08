import { Tutorial, SkillProgression, LearningAnalytics } from '@/types/education';
interface PathwayNode {
    tutorialId: string;
    requiredSkills: string[];
    providedSkills: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number;
    prerequisites: string[];
}
interface LearningPathway {
    userId: string;
    currentNode: string;
    completedNodes: string[];
    skillLevels: Record<string, number>;
    recommendedPath: string[];
}
export class TutorialPathwayService {
    private async getUserAnalytics(userId: string): Promise<LearningAnalytics> {
        const response = await fetch(`/api/learning-analytics/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user analytics');
        }
        return response.json();
    }
    private async getAvailableTutorials(): Promise<Tutorial[]> {
        const response = await fetch('/api/tutorials');
        if (!response.ok) {
            throw new Error('Failed to fetch tutorials');
        }
        return response.json();
    }
    private buildPathwayGraph(tutorials: Tutorial[]): Map<string, PathwayNode> {
        const graph = new Map<string, PathwayNode>();
        tutorials.forEach((tutorial: any) => {
            const node: PathwayNode = {
                tutorialId: tutorial.id,
                requiredSkills: tutorial.steps.flatMap(step => step.skills || []),
                providedSkills: tutorial.steps.flatMap(step => step.skills || []),
                difficulty: tutorial.difficulty,
                estimatedTime: tutorial.estimatedDuration,
                prerequisites: tutorial.steps.flatMap(step => step.prerequisites || [])
            };
            graph.set(tutorial.id, node);
        });
        return graph;
    }
    private calculateSkillGaps(currentSkills: Record<string, number>, requiredSkills: string[]): string[] {
        return requiredSkills.filter((skill: any) => !currentSkills[skill] || currentSkills[skill] < 1);
    }
    private async generateRecommendedPath(userId: string, currentSkills: Record<string, number>, targetSkills: string[]): Promise<string[]> {
        const tutorials = await this.getAvailableTutorials();
        const graph = this.buildPathwayGraph(tutorials);
        const analytics = await this.getUserAnalytics(userId);
        // Calculate skill gaps
        const skillGaps = this.calculateSkillGaps(currentSkills, targetSkills);
        // Find tutorials that help fill the skill gaps
        const relevantTutorials = Array.from(graph.entries())
            .filter(([_, node]: any) => node.providedSkills.some(skill => skillGaps.includes(skill)) &&
            node.requiredSkills.every(skill => currentSkills[skill] !== undefined && currentSkills[skill] >= 1))
            .sort((a, b) => {
            // Sort by number of relevant skills provided
            const aRelevance = a[1].providedSkills.filter((skill: any) => skillGaps.includes(skill)).length;
            const bRelevance = b[1].providedSkills.filter((skill: any) => skillGaps.includes(skill)).length;
            if (aRelevance !== bRelevance) {
                return bRelevance - aRelevance;
            }
            // Then by difficulty (prefer easier tutorials first)
            const difficultyOrder = { 'beginner': 0, 'intermediate': 1, 'advanced': 2 };
            return difficultyOrder[a[1].difficulty] - difficultyOrder[b[1].difficulty];
        });
        return relevantTutorials.map(([id]: any) => id);
    }
    public async updateLearningPathway(userId: string, targetSkills: string[]): Promise<LearningPathway> {
        // Get current skill levels
        const skillProgression = await fetch(`/api/skill-progression/${userId}`)
            .then(res => res.json());
        const currentSkills = Object.fromEntries(Object.entries(skillProgression.skills).map(([skill, data]: [
            string,
            any
        ]) => [
            skill,
            data.level
        ]));
        // Generate recommended path
        const recommendedPath = await this.generateRecommendedPath(userId, currentSkills, targetSkills);
        // Get completed tutorials
        const completedNodes = Object.values(skillProgression.skills).flatMap((skill: any) => skill.completedTutorials);
        // Create and return the learning pathway
        const pathway: LearningPathway = {
            userId,
            currentNode: recommendedPath[0] || '',
            completedNodes,
            skillLevels: currentSkills,
            recommendedPath
        };
        // Store the pathway
        await fetch('/api/learning-pathway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pathway)
        });
        return pathway;
    }
}
