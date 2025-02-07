import { ClientProfile } from '@/types/ClientProfile';

export interface TherapeuticPattern {
  type: string;
  triggers: Array<string>;
  responses: Array<string>;
  emotionalState: string;
  intensity: number; // 1-10
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

// Core therapeutic dialogue patterns
export const therapeuticPatterns: Array<TherapeuticPattern> = [
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

// Function to analyze client message for patterns
export function analyzeMessage(message: string, clientProfile: ClientProfile): {
  patterns: Array<TherapeuticPattern>;
  defenses: Array<DefenseMechanism>;
  emotions: Array<EmotionalResponse>;
} {
  const result = {
    patterns: [] as Array<TherapeuticPattern>,
    defenses: [] as Array<DefenseMechanism>,
    emotions: [] as Array<EmotionalResponse>
  };

  // Use clientProfile to contextualize analysis
  const personalizedTriggers = clientProfile.metadata?.history?.knownTriggers || [];
  const clientGoals = clientProfile.metadata?.goals || [];

  // Analyze message for patterns considering client's history
  therapeuticPatterns.forEach(pattern => {
    const hasRelevantTriggers = pattern.triggers.some(trigger => 
      message.toLowerCase().includes(trigger.toLowerCase()) ||
      personalizedTriggers.includes(trigger)
    );
    
    // Check if pattern relates to client goals
    const isGoalRelated = clientGoals.some(goal: unknown =>
      pattern.responses.some(response => 
        response.toLowerCase().includes(goal.toLowerCase())
      )
    );

    if (hasRelevantTriggers || isGoalRelated) {
      result.patterns.push(pattern);
    }
  });

  // Analyze for defense mechanisms
  defenseMechanisms.forEach(defense => {
    const hasDefenseBehavior = defense.behaviors.some(behavior =>
      message.toLowerCase().includes(behavior.toLowerCase())
    );
    if (hasDefenseBehavior) {
      result.defenses.push(defense);
    }
  });

  // Analyze emotional responses considering client goals
  emotionalResponses.forEach(emotion => {
    const hasEmotionalIndicator = emotion.manifestation.some(indicator =>
      message.toLowerCase().includes(indicator.toLowerCase())
    );
    if (hasEmotionalIndicator) {
      result.emotions.push(emotion);
    }
  });

  return result;
}
