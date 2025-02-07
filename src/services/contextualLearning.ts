import { Message } from "@/types/chat.ts";
import { SessionState } from "@/types/session.ts";
import { Client } from "@/types/Client.ts"; // Ensure this import is correct
import { analyzeMessageHistory } from "./sentimentAnalysis";
import { SessionAnalytics } from "./sessionAnalytics";
interface ContextMemory {
    shortTerm: {
        recentTopics: Array<string>;
        emotionalState: number;
        engagementLevel: number;
        lastResponses: Array<string>;
    };
    longTerm: {
        clientHistory: {
            commonTopics: Array<string>;
            preferredApproaches: Array<string>;
            triggerPatterns: Array<string>;
            successfulInterventions: Array<string>;
        };
        therapeuticProgress: {
            goalsAchieved: Array<string>;
            currentChallenges: Array<string>;
            adaptationHistory: Array<{
                approach: string;
                effectiveness: number;
                timestamp: number;
            }>;
        };
    };
}
export class ContextualLearningSystem {
    getHints(content: string) {
        throw new Error("Method not implemented.");
    }
    initialize(id: any): any {
        throw new Error("Method not implemented.");
    }
    private static instance: ContextualLearningSystem;
    private sessionAnalytics: SessionAnalytics;
    private contextMemory: Map<string, ContextMemory> = new Map();
    private constructor() {
        this.sessionAnalytics = new SessionAnalytics();
    }
    static getInstance(): ContextualLearningSystem {
        if (!ContextualLearningSystem.instance) {
            ContextualLearningSystem.instance = new ContextualLearningSystem();
        }
        return ContextualLearningSystem.instance;
    }
    async updateContext(clientId: string, session: SessionState, messages: Array<Message>, client: Client): Promise<void> {
        let memory = this.contextMemory.get(clientId);
        if (!memory) {
            memory = this.initializeMemory();
            this.contextMemory.set(clientId, memory);
        }
        // Update short-term memory
        const recentMessages = messages.slice(-5);
        memory.shortTerm = {
            recentTopics: SessionAnalytics.extractTopics(recentMessages.map((m: any) => m.content)),
            emotionalState: analyzeMessageHistory(recentMessages),
            engagementLevel: memory.shortTerm.engagementLevel,
            lastResponses: recentMessages
                .filter((m: any) => m.role === 'assistant')
                .map((m: any) => m.content),
        };
        memory.longTerm.clientHistory.commonTopics = this.updateTopics(memory.longTerm.clientHistory.commonTopics, SessionAnalytics.extractTopics(messages.map((m: any) => m.content)));
        // Update therapeutic progress
        const sessionMetrics = await SessionAnalytics.getSessionMetrics(session.id);
        memory.longTerm.therapeuticProgress.adaptationHistory.push({
            approach: session.mode,
            effectiveness: sessionMetrics.effectiveness || 0,
            timestamp: Date.now(),
        });
    }
    private initializeMemory(): ContextMemory {
        return {
            shortTerm: { recentTopics: [],
                emotionalState: 0,
                engagementLevel: 0,
                lastResponses: [],
            },
            longTerm: {
                clientHistory: {
                    commonTopics: [],
                    preferredApproaches: [],
                    triggerPatterns: [],
                    successfulInterventions: [],
                },
                therapeuticProgress: {
                    goalsAchieved: [],
                    currentChallenges: [],
                    adaptationHistory: [],
                },
            },
        };
    }
    private updateTopics(existing: Array<string>, new_topics: Array<string>): Array<string> {
        const topicFrequency = new Map<string, number>();
        // Count existing topics
        existing.forEach((topic: any) => {
            topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
        });
        // Add new topics
        new_topics.forEach((topic: any) => {
            topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
        });
        // Sort by frequency and take top 10
        return Array.from(topicFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([topic]: any) => topic);
    }
    async getContextualResponse(clientId: string, currentMessage: string): Promise<{
        contextualHints: Array<string>;
        suggestedApproaches: Array<string>;
        relevantHistory: Array<string>;
    }> {
        const memory = this.contextMemory.get(clientId);
        if (!memory) {
            return {
                contextualHints: [],
                suggestedApproaches: [],
                relevantHistory: [],
            };
        }
        // Analyze current context against memory
        const contextualHints = this.generateContextualHints(memory, currentMessage);
        const suggestedApproaches = this.suggestApproaches(memory);
        const relevantHistory = this.findRelevantHistory(memory, currentMessage);
        return {
            contextualHints,
            suggestedApproaches,
            relevantHistory,
        };
    }
    private generateContextualHints(memory: ContextMemory, currentMessage: string): Array<string> {
        const hints: Array<string> = [];
        // Add emotional state context
        if (memory.shortTerm.emotionalState < -0.3) {
            hints.push('Client showing signs of distress');
        }
        else if (memory.shortTerm.emotionalState > 0.3) {
            hints.push('Client showing positive engagement');
        }
        // Add engagement context
        if (memory.shortTerm.engagementLevel < 0.5) {
            hints.push('Low engagement detected');
        }
        // Add topic continuity hints
        const topicOverlap = memory.shortTerm.recentTopics.filter((topic: any) => memory.longTerm.clientHistory.commonTopics.includes(topic));
        if (topicOverlap.length > 0) {
            hints.push(`Recurring topics: ${topicOverlap.join(', ')}`);
        }
        return hints;
    }
    private suggestApproaches(memory: ContextMemory): Array<string> {
        // Analyze adaptation history to find most effective approaches
        const approachEffectiveness = new Map<string, number>();
        let totalEntries = 0;
        memory.longTerm.therapeuticProgress.adaptationHistory.forEach((entry: any) => {
            approachEffectiveness.set(entry.approach, (approachEffectiveness.get(entry.approach) || 0) + entry.effectiveness);
            totalEntries++;
        });
        // Convert to average effectiveness and sort
        return Array.from(approachEffectiveness.entries())
            .map(([approach, total]: any) => ({
            approach,
            effectiveness: total / totalEntries,
        }))
            .sort((a, b) => b.effectiveness - a.effectiveness)
            .slice(0, 3)
            .map((entry: any) => entry.approach);
    }
    findRelevantHistory(memory: ContextMemory, currentMessage: string): Array<string> {
        // Simple keyword-based relevance for now
        // TODO: Implement more sophisticated semantic matching
        const keywords = currentMessage.toLowerCase().split(' ');
        return memory.longTerm.clientHistory.commonTopics.filter((topic: any) => keywords.some(keyword => topic.toLowerCase().includes(keyword)));
    }
}
