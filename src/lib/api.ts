export interface ApiService {
  sessions: {
    start: (clientId: string, mode: string) => Promise<any>;
    end: (sessionId: string) => Promise<void>;
    switchMode: (sessionId: string, newMode: string) => Promise<void>;
  };
  // ... existing code ...
}

// ... existing code ... 