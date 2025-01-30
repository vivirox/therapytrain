export interface ClientProfile {
  id: number;
  name: string;
  age: number;
  gender: string;
  primary_issue: string;
  complexity: 'moderate' | 'high' | 'severe';
  description: string;
  key_traits: Array<string>;
  background: string;
  behavioral_patterns: Array<string>;
  triggers: Array<string>;
  communication_style: string;
  treatment_history: string;
  defense_mechanisms: Array<string>;
  therapeutic_challenges: Array<string>;
  created_at: string;
  updated_at: string;
}