export interface ScoringCriteria {
    category: string;
    subcategories: {
        name: string;
        weight: number;
        description: string;
        scoringGuide: {
            1: string;
            2: string;
            3: string;
            4: string;
            5: string;
        };
    }[];
}
export interface TherapeuticApproach {
    name: string;
    description: string;
    keyPrinciples: string[];
    recommendedInterventions: string[];
    scoringRubric: ScoringCriteria[];
}
// Define therapeutic approaches with their scoring rubrics
export const therapeuticApproaches: TherapeuticApproach[] = [
    {
        name: 'Cognitive Behavioral Therapy',
        description: 'A psycho-social intervention focusing on challenging and changing cognitive distortions and behaviors.',
        keyPrinciples: [
            'Identifying cognitive distortions',
            'Behavioral activation',
            'Cognitive restructuring',
            'Problem-solving orientation'
        ],
        recommendedInterventions: [
            'Thought records',
            'Behavioral experiments',
            'Activity scheduling',
            'Cognitive reframing'
        ],
        scoringRubric: [
            {
                category: 'Cognitive Intervention Skills',
                subcategories: [
                    {
                        name: 'Thought Identification',
                        weight: 0.2,
                        description: 'Ability to help client identify automatic thoughts and cognitive distortions',
                        scoringGuide: {
                            1: 'Failed to identify thoughts or cognitive patterns',
                            2: 'Limited identification of surface-level thoughts',
                            3: 'Adequate identification of thoughts and some patterns',
                            4: 'Good identification of thoughts and clear patterns',
                            5: 'Excellent identification of complex thought patterns and core beliefs'
                        }
                    },
                    {
                        name: 'Cognitive Restructuring',
                        weight: 0.3,
                        description: 'Effectiveness in helping client challenge and modify thoughts',
                        scoringGuide: {
                            1: 'No attempt at restructuring thoughts',
                            2: 'Basic attempts at challenging thoughts',
                            3: 'Adequate restructuring of simple thoughts',
                            4: 'Effective restructuring with good evidence',
                            5: 'Masterful restructuring with lasting change'
                        }
                    }
                ]
            },
            {
                category: 'Behavioral Techniques',
                subcategories: [
                    {
                        name: 'Behavioral Activation',
                        weight: 0.25,
                        description: 'Skill in implementing behavioral activation strategies',
                        scoringGuide: {
                            1: 'No behavioral interventions attempted',
                            2: 'Basic activity suggestions made',
                            3: 'Adequate activity planning and monitoring',
                            4: 'Good implementation of behavioral strategies',
                            5: 'Excellent behavioral activation with clear progress'
                        }
                    }
                ]
            }
        ]
    },
    {
        name: 'Person-Centered Therapy',
        description: 'A non-directive approach emphasizing empathy, unconditional positive regard, and genuineness.',
        keyPrinciples: [
            'Unconditional positive regard',
            'Empathic understanding',
            'Genuineness/Congruence',
            'Client self-direction'
        ],
        recommendedInterventions: [
            'Reflective listening',
            'Empathic responses',
            'Open-ended questions',
            'Validation'
        ],
        scoringRubric: [
            {
                category: 'Core Conditions',
                subcategories: [
                    {
                        name: 'Empathy',
                        weight: 0.3,
                        description: 'Ability to understand and communicate client\'s internal frame of reference',
                        scoringGuide: {
                            1: 'No empathic understanding shown',
                            2: 'Surface level empathy displayed',
                            3: 'Adequate empathic understanding',
                            4: 'Deep empathic understanding shown',
                            5: 'Exceptional empathic attunement'
                        }
                    },
                    {
                        name: 'Unconditional Positive Regard',
                        weight: 0.3,
                        description: 'Degree of acceptance and non-judgmental stance',
                        scoringGuide: {
                            1: 'Judgmental or conditional acceptance',
                            2: 'Limited acceptance shown',
                            3: 'Adequate unconditional acceptance',
                            4: 'Strong unconditional positive regard',
                            5: 'Exceptional acceptance and warmth'
                        }
                    }
                ]
            }
        ]
    }
];
// Helper function to calculate weighted score
export function calculateWeightedScore(scores: Record<string, number>, rubric: ScoringCriteria[]): number {
    let totalScore = 0;
    let totalWeight = 0;
    rubric.forEach((category: any) => {
        category.subcategories.forEach((sub: any) => {
            if (scores[sub.name]) {
                totalScore += scores[sub.name] * sub.weight;
                totalWeight += sub.weight;
            }
        });
    });
    return totalWeight > 0 ? totalScore / totalWeight : 0;
}
// Helper function to generate feedback based on scores
export function generateFeedback(scores: Record<string, number>, approach: TherapeuticApproach): string[] {
    const feedback: string[] = [];
    approach.scoringRubric.forEach((category: any) => {
        category.subcategories.forEach((sub: any) => {
            const score = scores[sub.name] || 0;
            feedback.push(`${sub.name}: ${sub.scoringGuide[score as 1 | 2 | 3 | 4 | 5]}`);
        });
    });
    return feedback;
}
