import { ClientProfile } from '../types/ClientProfile';

export const clientProfiles: ClientProfile[] = [
  {
    id: 1,
    name: "Alex Thompson",
    age: 28,
    gender: "Non-binary",
    primary_issue: "Treatment-Resistant Depression",
    complexity: "high",
    description: "Highly intelligent but resistant client who uses intellectual defenses to avoid emotional engagement",
    key_traits: [
      "Intellectualization",
      "Skepticism of therapy",
      "High verbal ability",
      "Emotional avoidance"
    ],
    background: "Former academic who left PhD program due to mental health issues. History of gifted child syndrome and high parental expectations.",
    behavioral_patterns: [
      "Questions therapeutic methods",
      "Uses humor to deflect",
      "Provides rational explanations for emotional issues",
      "Arrives exactly on time but reluctant to leave"
    ],
    triggers: [
      "Perceived condescension",
      "Emotional vulnerability",
      "Discussion of family expectations",
      "Academic failure"
    ],
    communication_style: "Articulate, analytical, and often uses academic language to maintain emotional distance",
    treatment_history: "Multiple brief therapy attempts, typically terminates when emotional work intensifies",
    defense_mechanisms: [
      "Intellectualization",
      "Rationalization",
      "Humor",
      "Avoidance"
    ],
    therapeutic_challenges: [
      "Breaking through intellectual defenses",
      "Building emotional awareness",
      "Maintaining therapeutic alliance",
      "Addressing resistance to change"
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Maria Gonzalez",
    age: 34,
    gender: "Female",
    primary_issue: "Complex PTSD with Crisis Presentation",
    complexity: "severe",
    description: "Trauma survivor with frequent crisis presentations and difficulty maintaining boundaries",
    key_traits: [
      "Emotional intensity",
      "Attachment issues",
      "Frequent crisis states",
      "Boundary struggles"
    ],
    background: "Survivor of childhood trauma and domestic violence. History of unstable relationships and self-harm behaviors.",
    behavioral_patterns: [
      "Frequent between-session contact attempts",
      "Emotional flooding in sessions",
      "Testing therapeutic boundaries",
      "Self-harm ideation when stressed"
    ],
    triggers: [
      "Perceived abandonment",
      "Authority figures",
      "Feeling unheard",
      "Personal space violations"
    ],
    communication_style: "Emotionally intense, sometimes scattered, alternates between over-sharing and withdrawal",
    treatment_history: "Multiple hospitalizations, previous therapists terminated due to boundary violations",
    defense_mechanisms: [
      "Splitting",
      "Projection",
      "Acting out",
      "Dissociation"
    ],
    therapeutic_challenges: [
      "Maintaining appropriate boundaries",
      "Crisis management",
      "Building stable therapeutic alliance",
      "Addressing trauma without retraumatization"
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "James Chen",
    age: 45,
    gender: "Male",
    primary_issue: "Narcissistic Traits with Depression",
    complexity: "high",
    description: "Successful executive presenting with depression, showing strong narcissistic defenses and resistance to vulnerability",
    key_traits: [
      "Grandiosity",
      "Perfectionism",
      "Status consciousness",
      "Difficulty with empathy"
    ],
    background: "High-achieving executive with history of professional success but personal relationship failures. Recent divorce and career setback.",
    behavioral_patterns: [
      "Attempts to control therapy process",
      "Devalues therapeutic insights",
      "Competitive with therapist",
      "Difficulty acknowledging mistakes"
    ],
    triggers: [
      "Perceived criticism",
      "Professional setbacks",
      "Feeling inferior",
      "Loss of control"
    ],
    communication_style: "Authoritative, sometimes condescending, focuses on achievements and external validation",
    treatment_history: "Brief couples therapy during divorce, no other mental health treatment history",
    defense_mechanisms: [
      "Grandiosity",
      "Projection",
      "Devaluation",
      "Denial"
    ],
    therapeutic_challenges: [
      "Building genuine rapport",
      "Addressing narcissistic defenses",
      "Facilitating vulnerability",
      "Managing countertransference"
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    name: "Sarah Mitchell",
    age: 19,
    gender: "Female",
    primary_issue: "Eating Disorder with High Resistance",
    complexity: "severe",
    description: "Young adult with anorexia nervosa showing high resistance to treatment and manipulation of support systems",
    key_traits: [
      "Perfectionism",
      "Manipulation tactics",
      "Denial of illness",
      "Competitive nature"
    ],
    background: "Competitive dancer with early onset of eating disorder. History of high achievement in academics and athletics.",
    behavioral_patterns: [
      "Minimizes health concerns",
      "Plays treatment team members against each other",
      "Presents false compliance",
      "Overexercising"
    ],
    triggers: [
      "Weight discussions",
      "Loss of control",
      "Body image",
      "Family meals"
    ],
    communication_style: "Superficially compliant but passive-aggressive, expert at deflection and minimization",
    treatment_history: "Multiple incomplete eating disorder programs, frequent medical monitoring",
    defense_mechanisms: [
      "Denial",
      "Manipulation",
      "Rationalization",
      "Passive aggression"
    ],
    therapeutic_challenges: [
      "Breaking through denial",
      "Managing manipulation attempts",
      "Maintaining firm boundaries",
      "Coordinating with treatment team"
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    name: "David Foster",
    age: 52,
    gender: "Male",
    primary_issue: "Treatment-Resistant Anxiety with Selective Mutism",
    complexity: "high",
    description: "Middle-aged professional with severe social anxiety and selective mutism in specific situations",
    key_traits: [
      "Extreme anxiety",
      "Selective mutism",
      "High intelligence",
      "Avoidance patterns"
    ],
    background: "Successful remote software developer with increasing isolation. History of childhood bullying and social trauma.",
    behavioral_patterns: [
      "Long silences in session",
      "Communicates through writing",
      "Extreme avoidance of social situations",
      "Rigid routines"
    ],
    triggers: [
      "Group situations",
      "Unexpected changes",
      "Direct confrontation",
      "Performance evaluation"
    ],
    communication_style: "Minimal verbal communication, prefers written responses, highly detailed when comfortable",
    treatment_history: "Multiple attempted CBT treatments, inconsistent medication compliance",
    defense_mechanisms: [
      "Withdrawal",
      "Isolation",
      "Intellectualization",
      "Avoidance"
    ],
    therapeutic_challenges: [
      "Establishing verbal communication",
      "Building trust",
      "Challenging avoidance",
      "Maintaining engagement"
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    name: "Maya Patel",
    age: 31,
    gender: "Female",
    primary_issue: "Borderline Traits with Substance Use",
    complexity: "severe",
    description: "Creative professional with emotional dysregulation and substance use issues, presenting with frequent life crises",
    key_traits: [
      "Emotional instability",
      "Substance use",
      "Creative expression",
      "Relationship instability"
    ],
    background: "Successful artist with history of unstable relationships and substance use. Childhood emotional neglect and early talent recognition.",
    behavioral_patterns: [
      "Rapid mood shifts",
      "Impulsive decisions",
      "Substance use when stressed",
      "Intense but unstable relationships"
    ],
    triggers: [
      "Relationship conflicts",
      "Professional criticism",
      "Feelings of emptiness",
      "Perceived rejection"
    ],
    communication_style: "Highly expressive, emotionally intense, uses artistic metaphors, can become nonverbal when overwhelmed",
    treatment_history: "Multiple substance use treatments, brief therapy attempts, current outpatient program",
    defense_mechanisms: [
      "Acting out",
      "Idealization/devaluation",
      "Substance use",
      "Dissociation"
    ],
    therapeutic_challenges: [
      "Managing crisis situations",
      "Addressing substance use",
      "Building emotional regulation",
      "Maintaining therapeutic boundaries"
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
