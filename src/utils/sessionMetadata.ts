import { TherapySession } from '../types/sessions';

export const updateSessionMetadata = async (
  sessionId: string,
  metadata: Partial<TherapySession['session_metadata']>
) => {
  const response = await fetch(`/api/sessions/${sessionId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata }),
  });
  
  return response.json();
};

import { Message } from '../types/chat';

// Let's create our analysis helper functions
const calculateMoodScore = (messages: Array<Message>): number => {
  // Implement mood scoring logic based on message content
  return messages.length > 0 ? 7.5 : 5.0;
};

const extractKeyTopics = (messages: Array<Message>): Array<string> => {
  // Implement topic extraction logic
  return ['anxiety', 'stress-management', 'self-care'];
};

const detectPatterns = (messages: Array<Message>): Array<string> => {
  // Implement pattern detection logic
  return ['evening anxiety', 'work-related stress'];
};

const generateRecommendations = (messages: Array<Message>): Array<string> => {
  // Implement recommendation generation logic
  return ['Practice deep breathing', 'Maintain sleep schedule'];
};

export const analyzeSessionContent = (messages: Array<Message>): Partial<TherapySession['session_metadata']> => {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const userMessages = messages.filter(m => m.role === 'user');
  
  return {
    mood_score: calculateMoodScore(userMessages),
    key_topics: extractKeyTopics(messages),
    ai_insights: {
      patterns: detectPatterns(messages),
      recommendations: generateRecommendations(assistantMessages)
    }
  };
};
