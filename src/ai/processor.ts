import { ClientProfile } from '@/types/ClientProfile';
import { analyzeMessage } from "./models/therapeuticPatterns";
import { Message } from '@/ollama/process';
interface ProcessorOptions {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
}
export interface ProcessedResponse {
    content: string;
    analysis: {
        patterns: Array<string>;
        defenses: Array<string>;
        emotions: Array<string>;
        intensity: number;
    };
}
export class TherapeuticAIProcessor {
    private clientProfile: ClientProfile;
    private emotionalState: {
        primary: string;
        intensity: number;
        triggers: Array<string>;
    };
    constructor(clientProfile: ClientProfile) {
        this.clientProfile = clientProfile;
        this.emotionalState = {
            primary: 'neutral',
            intensity: 5,
            triggers: []
        };
    }
    private adjustResponseBasedOnAnalysis(baseResponse: string, analysis: ReturnType<typeof analyzeMessage>): string {
        let adjustedResponse = baseResponse;
        // Apply defense mechanisms
        if (analysis.defenses.length > 0) {
            const defense = analysis.defenses[0];
            adjustedResponse = this.applyDefenseMechanism(adjustedResponse, defense);
        }
        // Apply emotional coloring
        if (analysis.emotions.length > 0) {
            const emotion = analysis.emotions[0];
            return this.applyEmotionalTone(adjustedResponse, emotion);
        }
        return adjustedResponse;
    }
    private applyDefenseMechanism(response: string, defense: {
        name: string;
        behaviors: Array<string>;
    }): string {
        switch (defense.name) {
            case 'denial':
                return response.replace(/I (think|feel|believe)/gi, 'I don\'t really $1');
            case 'projection':
                return response.replace(/I am/gi, 'You are');
            case 'rationalization':
                return `${response} But that's just logical, right?`;
            default:
                return response;
        }
    }
    private applyEmotionalTone(response: string, emotion: {
        emotion: string;
        intensity: number;
    }): string {
        const emotionalPhrases = {
            anger: ['!', '...', 'Whatever.'],
            anxiety: ['um', 'maybe', '...'],
            sadness: ['I guess', '*sigh*', '...']
        };
        const phrases = emotionalPhrases[emotion.emotion as keyof typeof emotionalPhrases] || [];
        if (phrases.length > 0) {
            const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
            return `${response} ${randomPhrase}`;
        }
        return response;
    }
    private updateEmotionalState(analysis: ReturnType<typeof analyzeMessage>): void {
        if (analysis.emotions.length > 0) {
            const dominantEmotion = analysis.emotions[0];
            this.emotionalState = {
                primary: dominantEmotion.emotion,
                intensity: dominantEmotion.intensity,
                triggers: dominantEmotion.triggers
            };
        }
    }
    async processMessage(messages: Array<Message>, options: ProcessorOptions = {}): Promise<ProcessedResponse> {
        const lastMessage = messages[messages.length - 1];
        const analysis = analyzeMessage(lastMessage.content, this.clientProfile);
        // Update emotional state based on analysis
        this.updateEmotionalState(analysis);
        // Prepare system message with current emotional state
        const systemMessage = {
            role: 'system',
            content: `You are roleplaying as ${this.clientProfile.name}, currently feeling ${this.emotionalState.primary} 
        with intensity ${this.emotionalState.intensity}/10. Your defense mechanisms include: 
        ${this.clientProfile.defense_mechanisms.join(', ')}. Respond authentically based on this emotional state.`
        };
        // Add system message to the conversation
        const enhancedMessages = [systemMessage, ...messages];
        try {
            const response = await fetch('https://api.gemcity.xyz/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'mistral',
                    messages: enhancedMessages,
                    stream: false,
                    options: {
                        temperature: options.temperature || 0.9,
                        top_p: options.topP || 0.95,
                        max_tokens: options.maxTokens || 1000
                    }
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to get response from AI service');
            }
            const data = await response.json();
            const baseResponse = data.message?.content || '';
            // Adjust response based on analysis
            const adjustedResponse = this.adjustResponseBasedOnAnalysis(baseResponse, analysis);
            return {
                content: adjustedResponse,
                analysis: {
                    patterns: analysis.patterns.map(p, unknown, unknown => p.type),
                    defenses: analysis.defenses.map(d, unknown, unknown => d.name),
                    emotions: analysis.emotions.map(e, unknown, unknown => e.emotion),
                    intensity: this.emotionalState.intensity
                }
            };
        }
        catch (error) {
            console.error('AI Processing Error:', error);
            throw error;
        }
    }
}
