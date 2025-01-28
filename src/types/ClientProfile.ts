export interface ClientProfile {
  id: number;
  name: string;
  age: number;
  gender: string;
  primary_issue: string;
  complexity: 'moderate' | 'high' | 'severe';
  description: string;
  key_traits: string[];
  background: string;
  behavioral_patterns: string[];
  triggers: string[];
  communication_style: string;
  treatment_history: string;
  defense_mechanisms: string[];
  therapeutic_challenges: string[];
  created_at: string;
  updated_at: string;
}