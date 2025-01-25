export interface Client {
  id: string; // Unique identifier for the client
  name: string; // Name of the client
  age: number; // Age of the client
  primary_issue: string; // Primary issue of the client
  complexity: string; // Complexity of the client's situation
  description: string; // Description of the client
  key_traits?: Array<string>; // Key traits of the client
  background?: string; // Background information of the client
}