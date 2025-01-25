export interface SessionState {
  id: string; // Unique identifier for the session
  mode: string; // Mode of the session
  interventions?: Array<any>; // Optional interventions related to the session
}
