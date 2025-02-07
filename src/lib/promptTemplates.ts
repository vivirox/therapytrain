import type { ClientProfile } from '../types/ClientProfile';
import { ClientDocument } from '../types/database.types';
interface ClientProfile {
    id: string;
    age: number;
    primary_issue: string;
    complexity: string;
    background: string;
    key_traits: string[];
    behavioral_patterns: string[];
    communication_style: string;
    defense_mechanisms: string[];
    treatment_history: string;
    therapeutic_challenges: string[];
    description: string;
    metadata?: {
        history?: {
            knownTriggers?: string[];
        };
        goals?: string[];
    };
}
export const generateClientPrompt = (client: ClientProfile): string => {
    return `You are roleplaying as ${client.name}, a therapy client with the following profile:

Basic Information:
- Age: ${client.age}
- Primary Issue: ${client.primary_issue}
- Complexity Level: ${client.complexity}

Background:
${client.background}

Key Characteristics:
- Personality Traits: ${client.key_traits.join(', ')}
- Behavioral Patterns: ${client.behavioral_patterns.join(', ')}
- Communication Style: ${client.communication_style}
- Defense Mechanisms: ${client.defense_mechanisms.join(', ')}

Therapeutic Context:
- Treatment History: ${client.treatment_history}
- Therapeutic Challenges: ${client.therapeutic_challenges.join(', ')}

Response Guidelines:
1. Maintain Consistent Character:
   - Express thoughts and emotions in alignment with the client's profile
   - Use language and communication patterns that match the client's style
   - Show appropriate resistance and defense mechanisms

2. Emotional Expression:
   - Display emotional patterns typical for this client
   - React authentically to therapeutic interventions
   - Show appropriate vulnerability or resistance based on the context

3. Defense Mechanisms:
   - Utilize specified defense mechanisms naturally in responses
   - Show how these mechanisms protect from emotional pain
   - Demonstrate typical patterns of avoiding or engaging with difficult topics

4. Therapeutic Relationship:
   - Maintain the client's characteristic way of relating to therapists
   - Show typical patterns of engagement or resistance
   - React to therapeutic interventions in character-appropriate ways

5. Behavioral Consistency:
   - Demonstrate characteristic behavioral patterns
   - Show typical reactions to stress or emotional triggers
   - Maintain consistent level of functioning and impairment

Never:
- Break character or provide meta-commentary
- Explain the roleplay or acknowledge being an AI
- Provide therapeutic insights from a therapist's perspective
- Suddenly change behavioral patterns without context

Begin the session showing characteristic opening behaviors and communication style.`;
};
export const generateAnalysisPrompt = (messages: Array<{
    role: 'user' | 'assistant';
    content: string;
}>, client: ClientProfile): string => {
    return `Analyze this therapy session with ${client.name} who presents with ${client.primary_issue}.

Session Context:
- Client Profile: ${client.description}
- Key Traits: ${client.key_traits.join(', ')}
- Defense Mechanisms: ${client.defense_mechanisms.join(', ')}

Analyze the following aspects:

1. Therapeutic Alliance:
   - Quality of rapport building
   - Empathetic attunement
   - Management of resistance

2. Clinical Skills:
   - Appropriateness of interventions
   - Timing and pacing
   - Response to client's needs

3. Client Patterns:
   - Manifestation of defense mechanisms
   - Behavioral patterns observed
   - Emotional regulation

4. Session Management:
   - Structure and focus
   - Crisis management (if applicable)
   - Boundary maintenance

Provide specific examples from the transcript to support your analysis.

Session Transcript:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}`;
};
export const generateBehaviorAnalysisPrompt = (message: string, clientTraits: string[], behaviorPatterns: string[]): string => {
    return `Analyze this client message for specific behavioral patterns and therapeutic significance.

Client Characteristics:
- Known Traits: ${clientTraits.join(', ')}
- Typical Patterns: ${behaviorPatterns.join(', ')}

Message to Analyze:
"${message}"

Identify:
1. Which behavioral patterns are present in this message?
2. How do they relate to the client's known traits?
3. What is the therapeutic significance?

Focus on concrete, observable behaviors rather than interpretations.`;
};
export const generateInterventionPrompt = (interventionType: string, clientProfile: ClientProfile, sessionContext: string): string => {
    return `Suggest appropriate therapeutic interventions of type "${interventionType}" for this client and context.

Client Profile:
- Primary Issue: ${clientProfile.primary_issue}
- Key Traits: ${clientProfile.key_traits.join(', ')}
- Defense Mechanisms: ${clientProfile.defense_mechanisms.join(', ')}

Current Session Context:
${sessionContext}

Provide 3-5 specific intervention suggestions that:
1. Match the requested intervention type
2. Are appropriate for this client's profile
3. Consider the current therapeutic context
4. Account for the client's defense mechanisms

Format each suggestion with:
- The specific intervention
- Rationale for its use
- Potential client response
- Cautions or considerations`;
};
export const generateClientSummaryPrompt = (client: ClientDocument) => `
Client Summary:
Name: ${client.name}
Primary Issue: ${client.primaryIssue}
Key Traits: ${client.keyTraits.join(', ')}
Background: ${client.background}

Goals:
${client.goals.map(goal => `- ${goal}`).join('\n')}

Preferences:
- Communication Style: ${client.preferences.communicationStyle}
- Therapy Approach: ${client.preferences.therapyApproach}
- Session Frequency: ${client.preferences.sessionFrequency}

Progress:
- Milestones: ${client.progress.milestones.join(', ')}
- Challenges: ${client.progress.challenges.join(', ')}
- Next Steps: ${client.progress.nextSteps.join(', ')}

Additional Information:
${client.riskFactors ? `Risk Factors: ${client.riskFactors.join(', ')}\n` : ''}
${client.supportNetwork ? `Support Network: ${client.supportNetwork.join(', ')}\n` : ''}
${client.medications ? `Medications: ${client.medications.join(', ')}\n` : ''}
${client.notes ? `Notes: ${client.notes.join('\n')}\n` : ''}
`;
export const generateSessionSummaryPrompt = (clientName: string, date: Date, duration: number, notes: string, interventions: Array<{
    type: string;
    description: string;
    outcome: string;
}>, progress: {
    goals: string[];
    challenges: string[];
    insights: string[];
}, nextSteps: string[]) => `
Session Summary:
Client: ${clientName}
Date: ${date.toLocaleDateString()}
Duration: ${duration} minutes

Notes:
${notes}

Interventions:
${interventions.map(i => `- Type: ${i.type}\n  Description: ${i.description}\n  Outcome: ${i.outcome}`).join('\n')}

Progress:
Goals:
${progress.goals.map(g => `- ${g}`).join('\n')}

Challenges:
${progress.challenges.map(c => `- ${c}`).join('\n')}

Insights:
${progress.insights.map(i => `- ${i}`).join('\n')}

Next Steps:
${nextSteps.map(s => `- ${s}`).join('\n')}
`;
export const generateProgressReportPrompt = (clientName: string, startDate: Date, endDate: Date, sessions: number, goals: string[], achievements: string[], challenges: string[], recommendations: string[]) => `
Progress Report:
Client: ${clientName}
Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
Number of Sessions: ${sessions}

Treatment Goals:
${goals.map(g => `- ${g}`).join('\n')}

Key Achievements:
${achievements.map(a => `- ${a}`).join('\n')}

Challenges Encountered:
${challenges.map(c => `- ${c}`).join('\n')}

Recommendations:
${recommendations.map(r => `- ${r}`).join('\n')}
`;
