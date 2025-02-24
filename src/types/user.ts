import { BaseEntity, Metadata } from './common';

export interface UserProfile extends BaseEntity {
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user' | 'therapist';
  preferences?: UserPreferences;
  metadata?: Metadata;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  [key: string]: unknown;
}

export interface UserSession {
  id: string;
  user: UserProfile;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  metadata?: Metadata;
}

export interface UserActivity {
  id: string;
  user_id: string;
  type: string;
  details: Record<string, unknown>;
  created_at: string;
  metadata?: Metadata;
}

export interface UserSettings {
  id: string;
  user_id: string;
  preferences: UserPreferences;
  security: {
    two_factor_enabled: boolean;
    login_history_enabled: boolean;
    notification_on_login: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'private' | 'contacts';
    activity_visibility: 'public' | 'private' | 'contacts';
    show_online_status: boolean;
  };
  created_at: string;
  updated_at: string;
  metadata?: Metadata;
}

export interface UserStats {
  total_sessions: number;
  total_clients: number;
  average_session_duration: number;
  completion_rate: number;
  satisfaction_score: number;
  last_active_at: string;
  metadata?: Metadata;
}

export interface TherapistProfile extends UserProfile {
  specializations: string[];
  certifications: string[];
  experience_years: number;
  education: {
    degree: string;
    institution: string;
    year: number;
  }[];
  availability: {
    schedule: {
      [day: string]: {
        start: string;
        end: string;
      }[];
    };
    timezone: string;
  };
  rating: number;
  total_sessions: number;
  languages: string[];
} 