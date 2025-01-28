import { ClientProfile } from '@/types/ClientProfile';

export interface TherapeuticPattern {
  type: string;
  triggers: string[];
  responses: string[];
  emotionalState: string;
  intensity: number; // 1-10
}

export interface DefenseMechanism {
  name: string;
  description: string;
  triggers: string[];
  behaviors: string[];
  intensity: number; // 1-10
}

export interface EmotionalResponse {
  emotion: string;
  intensity: number; // 1-10
  triggers: string[];
  manifestation: string[];
}

// Core therapeutic dialogue patterns
export const therapeuticPatterns: TherapeuticPattern[] = [
  {
    type: 'resistance',
    triggers: ['why', 'how do you know', 'you don\'t understand'],
    responses: [
      'deflecting the question',
      'changing the subject',
      'expressing skepticism',
      'challenging the therapist'
    ],
    emotionalState: 'defensive',
    intensity: 7
  },
  {
    type: 'transference',
    triggers: ['you remind me of', 'just like my', 'always'],
    responses: [
      'projecting past relationships',
      'emotional displacement',
      'pattern repetition'
    ],
    emotionalState: 'triggered',
    intensity: 8
  },
  {
    type: 'breakthrough',
    triggers: ['I never thought about', 'I just realized', 'that makes sense'],
    responses: [
      'emotional release',
      'new understanding',
      'connecting patterns'
    ],
    emotionalState: 'insightful',
    intensity: 6
  }
];

// Common defense mechanisms
export const defenseMechanisms: DefenseMechanism[] = [
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
export const emotionalResponses: EmotionalResponse[] = [
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

// Function to analyze client message for patterns
export function analyzeMessage(message: string, clientProfile: ClientProfile): {
  patterns: TherapeuticPattern[];
  defenses: DefenseMechanism[];
  emotions: EmotionalResponse[];
} {
  const result = {
    patterns: [] as TherapeuticPattern[],
    defenses: [] as DefenseMechanism[],
    emotions: [] as EmotionalResponse[]
  };

  // Check for therapeutic patterns
  therapeuticPatterns.forEach(pattern => {
    if (pattern.triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    )) {
      result.patterns.push(pattern);
    }
  });

  // Check for defense mechanisms
  defenseMechanisms.forEach(defense => {
    if (defense.triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    )) {
      result.defenses.push(defense);
    }
  });

  // Check for emotional responses
  emotionalResponses.forEach(emotion => {
    if (emotion.triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase())
    )) {
      result.emotions.push(emotion);
    }
  });

  return result;
}
