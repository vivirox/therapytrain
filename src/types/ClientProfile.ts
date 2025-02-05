export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  metadata?: {
    history?: {
      knownTriggers?: string[];
      sessions?: Array<{
        date: string;
        notes: string;
        outcomes: string[];
      }>;
    };
    goals?: string[];
    preferences?: {
      communicationStyle?: string;
      interventionPreferences?: string[];
    };
  };
}