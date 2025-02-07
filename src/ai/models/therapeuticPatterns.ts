import { ClientProfile } from '../types/ClientProfile';
export interface TherapeuticPattern {
    name: string;
    description: string;
    keywords: string[];
    examples: string[];
    isApplicable: (message: string, context: MessageContext) => boolean;
}
export interface DefenseMechanism {
    name: string;
    description: string;
    triggers: Array<string>;
    behaviors: Array<string>;
    intensity: number; // 1-10
}
export interface EmotionalResponse {
    emotion: string;
    intensity: number; // 1-10
    triggers: Array<string>;
    manifestation: Array<string>;
}
interface MessageContext {
    clientGoals: string[];
    sessionHistory: string[];
    clientProfile: {
        preferredApproach?: string;
        triggers?: string[];
        strengths?: string[];
    };
}
// Core therapeutic dialogue patterns
export const therapeuticPatterns: Array<TherapeuticPattern> = [
    {
        name: 'resistance',
        description: 'Resistance to change or questioning',
        keywords: ['why', 'how do you know', 'you don\'t understand'],
        examples: [
            'deflecting the question',
            'changing the subject',
            'expressing skepticism',
            'challenging the therapist'
        ],
        isApplicable: (message: string, context: MessageContext) => {
            const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
            return isGoalRelated;
        },
    },
    {
        name: 'transference',
        description: 'Projecting past relationships onto the therapist',
        keywords: ['you remind me of', 'just like my', 'always'],
        examples: [
            'projecting past relationships',
            'emotional displacement',
            'pattern repetition'
        ],
        isApplicable: (message: string, context: MessageContext) => {
            const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
            return isGoalRelated;
        },
    },
    {
        name: 'breakthrough',
        description: 'Emotional release and new understanding',
        keywords: ['I never thought about', 'I just realized', 'that makes sense'],
        examples: [
            'emotional release',
            'new understanding',
            'connecting patterns'
        ],
        isApplicable: (message: string, context: MessageContext) => {
            const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
            return isGoalRelated;
        },
    },
    {
        name: 'Goal Alignment',
        description: 'Aligns responses with client\'s therapeutic goals',
        keywords: ['goal', 'objective', 'aim', 'target'],
        examples: [
            'How does this relate to your goal of...',
            'This seems connected to your objective of...',
        ],
        isApplicable: (message: string, context: MessageContext) => {
            const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
            return isGoalRelated;
        },
    },
];
// Common defense mechanisms
export const defenseMechanisms: Array<DefenseMechanism> = [
    {
        name: 'denial',
        description: 'Refusing to accept reality or facts',
        triggers: ['confrontation', 'evidence', 'direct questions'],
        behaviors: [
            'dismissing facts',
            'minimizing issues',
            'changing the subject'
        ],
        intensity: 8
    },
    {
        name: 'projection',
        description: 'Attributing own feelings/thoughts to others',
        triggers: ['criticism', 'personal questions', 'emotional topics'],
        behaviors: [
            'blaming others',
            'seeing own traits in others',
            'deflecting responsibility'
        ],
        intensity: 7
    },
    {
        name: 'rationalization',
        description: 'Making excuses or logical explanations',
        triggers: ['mistakes', 'confrontation', 'consequences'],
        behaviors: [
            'making excuses',
            'intellectual explanations',
            'justifying actions'
        ],
        intensity: 6
    }
];
// Emotional response patterns
export const emotionalResponses: Array<EmotionalResponse> = [
    {
        emotion: 'anger',
        intensity: 8,
        triggers: ['criticism', 'feeling misunderstood', 'perceived judgment'],
        manifestation: [
            'raised voice',
            'defensive language',
            'confrontational stance'
        ]
    },
    {
        emotion: 'anxiety',
        intensity: 7,
        triggers: ['uncertainty', 'past trauma', 'future scenarios'],
        manifestation: [
            'rapid speech',
            'circular thinking',
            'physical restlessness'
        ]
    },
    {
        emotion: 'sadness',
        intensity: 6,
        triggers: ['loss', 'disappointment', 'isolation'],
        manifestation: [
            'withdrawn behavior',
            'tearfulness',
            'hopeless language'
        ]
    }
];
export function analyzeMessage(message: string, context: MessageContext): TherapeuticPattern[] {
    const patterns = getTherapeuticPatterns();
    return patterns.filter(pattern => pattern.isApplicable(message, context));
}
function getTherapeuticPatterns(): TherapeuticPattern[] {
    return [
        {
            name: 'resistance',
            description: 'Resistance to change or questioning',
            keywords: ['why', 'how do you know', 'you don\'t understand'],
            examples: [
                'deflecting the question',
                'changing the subject',
                'expressing skepticism',
                'challenging the therapist'
            ],
            isApplicable: (message: string, context: MessageContext) => {
                const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
                return isGoalRelated;
            },
        },
        {
            name: 'transference',
            description: 'Projecting past relationships onto the therapist',
            keywords: ['you remind me of', 'just like my', 'always'],
            examples: [
                'projecting past relationships',
                'emotional displacement',
                'pattern repetition'
            ],
            isApplicable: (message: string, context: MessageContext) => {
                const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
                return isGoalRelated;
            },
        },
        {
            name: 'breakthrough',
            description: 'Emotional release and new understanding',
            keywords: ['I never thought about', 'I just realized', 'that makes sense'],
            examples: [
                'emotional release',
                'new understanding',
                'connecting patterns'
            ],
            isApplicable: (message: string, context: MessageContext) => {
                const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
                return isGoalRelated;
            },
        },
        {
            name: 'Goal Alignment',
            description: 'Aligns responses with client\'s therapeutic goals',
            keywords: ['goal', 'objective', 'aim', 'target'],
            examples: [
                'How does this relate to your goal of...',
                'This seems connected to your objective of...',
            ],
            isApplicable: (message: string, context: MessageContext) => {
                const isGoalRelated = context.clientGoals.some((goal) => message.toLowerCase().includes(goal.toLowerCase()));
                return isGoalRelated;
            },
        },
    ];
}
