import { Database } from '@/database.types';

export interface Client {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfile extends Client {
  id: string;
  name: string;
  primary_issue: string;
  secondaryIssues?: string[];
  goals: string[];
  medications?: string[];
  allergies?: string[];
  diagnosis?: string[];
  treatmentHistory?: string;
  notes?: string;
  riskLevel: 'low' | 'medium' | 'high';
  safetyPlan?: {
    triggers: string[];
    copingStrategies: string[];
    supportContacts: Array<{
      name: string;
      relationship: string;
      phoneNumber: string;
    }>;
    emergencyResources: string[];
    safeEnvironments: string[];
  };
  preferences?: {
    communicationPreference: 'text' | 'email' | 'phone';
    appointmentReminders: boolean;
    language: string;
    timezone: string;
    communication_style?: string;
  };
}

export interface ClientSession {
  id: string;
  clientId: string;
  therapistId: string;
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  type: 'initial' | 'follow-up' | 'crisis' | 'group';
  mode: 'video' | 'audio' | 'chat' | 'in-person';
  notes?: string;
  metrics?: SessionMetrics;
  interventions?: Intervention[];
  emotionalStates?: EmotionalState[];
  goals?: {
    discussed: string[];
    progress: Record<string, number>;
    newGoals: string[];
  };
}

export interface Intervention {
  id: string;
  sessionId: string;
  type: InterventionType;
  strategy: InterventionStrategy;
  description: string;
  startTime: string;
  endTime?: string;
  outcome?: string;
  effectiveness?: number;
  notes?: string;
}

export enum InterventionType {
  CBT = 'cbt',
  DBT = 'dbt',
  MINDFULNESS = 'mindfulness',
  EXPOSURE = 'exposure',
  BEHAVIORAL_ACTIVATION = 'behavioral_activation',
  CRISIS_INTERVENTION = 'crisis_intervention',
  MOTIVATIONAL_INTERVIEWING = 'motivational_interviewing',
  PSYCHOEDUCATION = 'psychoeducation',
  SKILLS_TRAINING = 'skills_training',
  OTHER = 'other'
}

export interface InterventionStrategy {
  name: string;
  description: string;
  targetSymptoms: string[];
  expectedOutcomes: string[];
  duration?: number;
  contraindications?: string[];
  requiredResources?: string[];
  evidenceBase?: string;
}

export interface SessionMetrics {
  duration: number;
  interventionCount: number;
  goalProgress: Record<string, number>;
  emotionalStateChanges: {
    start: EmotionalState;
    end: EmotionalState;
    significant_changes?: Array<{
      time: string;
      from: EmotionalState;
      to: EmotionalState;
      trigger?: string;
    }>;
  };
  riskAssessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigationStrategies: string[];
  };
  clientEngagement: number;
  therapeuticAlliance: number;
  homeworkCompletion?: number;
  nextSteps: string[];
}

export interface EmotionalState {
  timestamp: string;
  primaryEmotion: string;
  intensity: number;
  secondaryEmotions?: string[];
  triggers?: string[];
  physicalSensations?: string[];
  thoughts?: string[];
  behaviors?: string[];
}

// Types from Database
export type DbClient = Database['public']['Tables']['clients']['Row'];
export type DbClientProfile = Database['public']['Tables']['client_profiles']['Row'];
export type DbClientSession = Database['public']['Tables']['sessions']['Row'];
export type DbIntervention = Database['public']['Tables']['interventions']['Row']; 