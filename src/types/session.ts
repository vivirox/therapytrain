export interface SessionState {
  messages: any; // Messages in the session
  id: string; // Unique identifier for the session
  mode: string; // Mode of the session
  interventions?: Array<any>; // Optional interventions related to the session
}

export interface Intervention {
  id: string;
  type: string;
  timestamp: number;
}
