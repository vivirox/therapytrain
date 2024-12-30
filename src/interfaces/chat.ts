// Correct way - all exported
export interface ChatInterface {
  message: string;
}

export interface ChatInterface {
  timestamp: number;
}

// OR all local (without export)
interface ChatInterface {
  message: string;
}

interface ChatInterface {
  timestamp: number;
}
