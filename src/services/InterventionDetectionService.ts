import { EventEmitter } from 'events';
import { TherapeuticPattern } from '@/ai/models/therapeuticPatterns';
import { SessionAnalytics } from './sessionAnalytics';
import { InterventionOptimizationSystem } from './interventionOptimization';

export interface Intervention {
    id: string;
    type: InterventionType;
    timestamp: Date;
    description: string;
    targetOutcome: string;
    effectiveness?: number;
    context: InterventionContext;
}

export type InterventionType = 
    | 'cognitive-restructuring'
    | 'behavioral-activation'
    | 'mindfulness'
    | 'exposure'
    | 'validation'
    | 'psychoeducation'
    | 'skills-training'
    | 'crisis-intervention';

interface InterventionContext {
    clientState: {
        emotionalState: number;
        engagementLevel: number;
        currentTopics: string[];
    };
    sessionState: {
        duration: number;
        interventionCount: number;
        recentInterventions: string[];
    };
    therapeuticRelationship: {
        alliance: number;
        resistance: number;
        rapport: number;
    };
}

interface InterventionEffectiveness {
    interventionId: string;
    score: number;
    metrics: {
        clientEngagement: number;
        emotionalShift: number;
        goalProgress: number;
        behavioralChange: number;
    };
    timestamp: Date;
}

export class InterventionDetectionService extends EventEmitter {
    private static instance: InterventionDetectionService;
    private sessionAnalytics: SessionAnalytics;
    private optimizationSystem: InterventionOptimizationSystem;
    private interventionHistory: Map<string, Intervention[]>;
    private effectivenessMetrics: Map<string, InterventionEffectiveness[]>;

    private constructor() {
        super();
        this.sessionAnalytics = new SessionAnalytics();
        this.optimizationSystem = InterventionOptimizationSystem.getInstance();
        this.interventionHistory = new Map();
        this.effectivenessMetrics = new Map();
    }

    public static getInstance(): InterventionDetectionService {
        if (!InterventionDetectionService.instance) {
            InterventionDetectionService.instance = new InterventionDetectionService();
        }
        return InterventionDetectionService.instance;
    }

    public async detectIntervention(message: string, context: InterventionContext): Promise<Intervention | null> {
        // Analyze message for intervention patterns
        const patterns = await this.analyzeInterventionPatterns(message);
        if (!patterns.length) return null;

        // Classify the intervention type
        const interventionType = await this.classifyInterventionType(patterns, message);
        if (!interventionType) return null;

        const intervention: Intervention = {
            id: `int_${Date.now()}`,
            type: interventionType,
            timestamp: new Date(),
            description: message,
            targetOutcome: await this.determineTargetOutcome(interventionType, context),
            context
        };

        // Store intervention
        this.storeIntervention(intervention);

        // Emit detection event
        this.emit('intervention:detected', intervention);

        return intervention;
    }

    public async trackEffectiveness(interventionId: string, metrics: {
        clientEngagement: number;
        emotionalShift: number;
        goalProgress: number;
        behavioralChange: number;
    }): Promise<void> {
        const effectiveness: InterventionEffectiveness = {
            interventionId,
            score: this.calculateEffectivenessScore(metrics),
            metrics,
            timestamp: new Date()
        };

        // Store effectiveness metrics
        const existing = this.effectivenessMetrics.get(interventionId) || [];
        this.effectivenessMetrics.set(interventionId, [...existing, effectiveness]);

        // Update intervention with overall effectiveness
        const intervention = await this.getIntervention(interventionId);
        if (intervention) {
            intervention.effectiveness = effectiveness.score;
            this.emit('intervention:effectiveness_updated', {
                interventionId,
                effectiveness: effectiveness.score
            });
        }
    }

    public async generateRecommendations(context: InterventionContext): Promise<{
        type: InterventionType;
        confidence: number;
        reasoning: string;
    }[]> {
        return this.optimizationSystem.recommendIntervention(
            'current_session',
            {
                emotionalState: context.clientState.emotionalState,
                engagementLevel: context.clientState.engagementLevel,
                recentTopics: context.clientState.currentTopics
            }
        );
    }

    private async analyzeInterventionPatterns(message: string): Promise<TherapeuticPattern[]> {
        // Analyze message for therapeutic patterns
        const patterns = [
            this.checkForCognitiveRestructuring(message),
            this.checkForBehavioralActivation(message),
            this.checkForMindfulness(message),
            this.checkForValidation(message),
            this.checkForPsychoeducation(message),
            this.checkForSkillsTraining(message),
            this.checkForCrisisIntervention(message)
        ].filter(Boolean) as TherapeuticPattern[];

        return patterns;
    }

    private async classifyInterventionType(
        patterns: TherapeuticPattern[],
        message: string
    ): Promise<InterventionType | null> {
        // Implement classification logic based on patterns and message content
        const patternScores = new Map<InterventionType, number>();

        patterns.forEach(pattern => {
            const type = this.mapPatternToInterventionType(pattern);
            if (type) {
                patternScores.set(type, (patternScores.get(type) || 0) + 1);
            }
        });

        // Get the intervention type with the highest score
        let maxScore = 0;
        let detectedType: InterventionType | null = null;

        patternScores.forEach((score, type) => {
            if (score > maxScore) {
                maxScore = score;
                detectedType = type;
            }
        });

        return detectedType;
    }

    private mapPatternToInterventionType(pattern: TherapeuticPattern): InterventionType | null {
        // Map therapeutic patterns to intervention types
        const patternTypeMap: Record<string, InterventionType> = {
            'cognitive-distortion': 'cognitive-restructuring',
            'behavioral-activation': 'behavioral-activation',
            'mindfulness': 'mindfulness',
            'exposure': 'exposure',
            'validation': 'validation',
            'psychoeducation': 'psychoeducation',
            'skills-training': 'skills-training',
            'crisis': 'crisis-intervention'
        };

        return patternTypeMap[pattern.name] || null;
    }

    private async determineTargetOutcome(type: InterventionType, context: InterventionContext): string {
        // Define expected outcomes based on intervention type and context
        const outcomeMap: Record<InterventionType, string> = {
            'cognitive-restructuring': 'Modify negative thought patterns',
            'behavioral-activation': 'Increase engagement in positive activities',
            'mindfulness': 'Improve present-moment awareness',
            'exposure': 'Reduce avoidance behaviors',
            'validation': 'Enhance emotional acceptance',
            'psychoeducation': 'Increase understanding of psychological concepts',
            'skills-training': 'Develop coping mechanisms',
            'crisis-intervention': 'Stabilize immediate crisis'
        };

        return outcomeMap[type] || 'Improve therapeutic progress';
    }

    private calculateEffectivenessScore(metrics: {
        clientEngagement: number;
        emotionalShift: number;
        goalProgress: number;
        behavioralChange: number;
    }): number {
        // Calculate weighted effectiveness score
        const weights = {
            clientEngagement: 0.25,
            emotionalShift: 0.25,
            goalProgress: 0.3,
            behavioralChange: 0.2
        };

        return (
            metrics.clientEngagement * weights.clientEngagement +
            metrics.emotionalShift * weights.emotionalShift +
            metrics.goalProgress * weights.goalProgress +
            metrics.behavioralChange * weights.behavioralChange
        );
    }

    private storeIntervention(intervention: Intervention): void {
        const sessionId = 'current_session'; // Replace with actual session ID
        const existing = this.interventionHistory.get(sessionId) || [];
        this.interventionHistory.set(sessionId, [...existing, intervention]);
    }

    private async getIntervention(interventionId: string): Promise<Intervention | null> {
        for (const interventions of this.interventionHistory.values()) {
            const found = interventions.find(i => i.id === interventionId);
            if (found) return found;
        }
        return null;
    }

    // Pattern detection methods
    private checkForCognitiveRestructuring(message: string): TherapeuticPattern | null {
        const keywords = [
            'think about it differently',
            'alternative perspective',
            'evidence for',
            'evidence against',
            'cognitive distortion',
            'reframe'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'cognitive-distortion',
                description: 'Cognitive restructuring intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }

    private checkForBehavioralActivation(message: string): TherapeuticPattern | null {
        const keywords = [
            'activity',
            'schedule',
            'plan',
            'engage',
            'participate',
            'do something'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'behavioral-activation',
                description: 'Behavioral activation intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }

    private checkForMindfulness(message: string): TherapeuticPattern | null {
        const keywords = [
            'present moment',
            'mindful',
            'awareness',
            'observe',
            'notice',
            'breath'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'mindfulness',
                description: 'Mindfulness intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }

    private checkForValidation(message: string): TherapeuticPattern | null {
        const keywords = [
            'understand',
            'makes sense',
            'valid',
            'natural',
            'normal to feel',
            'acknowledge'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'validation',
                description: 'Validation intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }

    private checkForPsychoeducation(message: string): TherapeuticPattern | null {
        const keywords = [
            'research shows',
            'common experience',
            'typically',
            'understand how',
            'learn about',
            'explain'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'psychoeducation',
                description: 'Psychoeducation intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }

    private checkForSkillsTraining(message: string): TherapeuticPattern | null {
        const keywords = [
            'practice',
            'skill',
            'technique',
            'strategy',
            'tool',
            'exercise'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'skills-training',
                description: 'Skills training intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }

    private checkForCrisisIntervention(message: string): TherapeuticPattern | null {
        const keywords = [
            'crisis',
            'emergency',
            'immediate',
            'urgent',
            'safety',
            'risk'
        ];

        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
            return {
                name: 'crisis',
                description: 'Crisis intervention',
                keywords,
                examples: [],
                isApplicable: () => true
            };
        }

        return null;
    }
} 