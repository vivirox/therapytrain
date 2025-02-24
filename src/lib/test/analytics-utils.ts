import { AnalyticsEvent, AnalyticsConfig, AnalyticsSummary } from '@/types/analytics';

// Mock event data
export const generateTestEvent = (overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  type: 'test_event',
  timestamp: new Date(),
  userId: 'test-user',
  sessionId: 'test-session',
  data: {},
  ...overrides,
});

// Mock config data
export const generateTestConfig = (overrides: Partial<AnalyticsConfig> = {}): AnalyticsConfig => ({
  enabled: true,
  samplingRate: 1.0,
  retentionDays: 30,
  anonymize: false,
  excludedEvents: [],
  ...overrides,
});

// Mock summary data
export const generateTestSummary = (overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary => ({
  totalEvents: 100,
  uniqueUsers: 10,
  activeSessions: 5,
  eventsByType: {
    'test_event': 50,
    'user_action': 30,
    'system_event': 20,
  },
  topUsers: [
    { userId: 'user-1', eventCount: 30 },
    { userId: 'user-2', eventCount: 25 },
    { userId: 'user-3', eventCount: 20 },
  ],
  timeDistribution: {
    '00:00': 10,
    '01:00': 15,
    '02:00': 20,
  },
  ...overrides,
});

// Mock functions
let mockEvents: AnalyticsEvent[] = [];
let mockConfig: AnalyticsConfig = generateTestConfig();
let mockSummary: AnalyticsSummary = generateTestSummary();

export const setupAnalyticsMocks = () => {
  mockEvents = [];
  mockConfig = generateTestConfig();
  mockSummary = generateTestSummary();
};

export const resetAnalyticsMocks = () => {
  mockEvents = [];
  mockConfig = generateTestConfig();
  mockSummary = generateTestSummary();
};

// Mock API responses
export const mockTrackEvent = async (event: AnalyticsEvent): Promise<void> => {
  mockEvents.push(event);
};

export const mockGetEvents = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsEvent[]> => {
  return mockEvents.filter(
    (event) =>
      event.userId === userId &&
      event.timestamp >= startDate &&
      event.timestamp <= endDate
  );
};

export const mockGetConfig = async (): Promise<AnalyticsConfig> => {
  return mockConfig;
};

export const mockGetSummary = async (): Promise<AnalyticsSummary> => {
  return mockSummary;
};

// Event generators for specific analytics events
export const generateTutorialProgressEvent = (
  userId: string,
  tutorialId: string,
  progress: number
): AnalyticsEvent => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  type: 'tutorial_progress',
  timestamp: new Date(),
  userId,
  sessionId: 'test-session',
  data: {
    tutorialId,
    progress,
  },
});

export const generateQuizCompletionEvent = (
  userId: string,
  quizId: string,
  score: number,
  timeSpent: number
): AnalyticsEvent => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  type: 'quiz_completion',
  timestamp: new Date(),
  userId,
  sessionId: 'test-session',
  data: {
    quizId,
    score,
    timeSpent,
  },
});

export const generateResourceEngagementEvent = (
  userId: string,
  resourceId: string,
  resourceType: string,
  engagementType: string
): AnalyticsEvent => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  type: 'resource_engagement',
  timestamp: new Date(),
  userId,
  sessionId: 'test-session',
  data: {
    resourceId,
    resourceType,
    engagementType,
  },
});

export const generatePeerInteractionEvent = (
  userId: string,
  interactionType: string,
  targetId: string
): AnalyticsEvent => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  type: 'peer_interaction',
  timestamp: new Date(),
  userId,
  sessionId: 'test-session',
  data: {
    interactionType,
    targetId,
  },
});

// Assertion helpers
export const expectEventTracked = (event: AnalyticsEvent) => {
  const trackedEvent = mockEvents.find((e) => e.id === event.id);
  expect(trackedEvent).toBeDefined();
  expect(trackedEvent).toMatchObject(event);
};

export const expectEventsCount = (count: number) => {
  expect(mockEvents.length).toBe(count);
};

export const expectEventsByType = (type: string, count: number) => {
  const typeEvents = mockEvents.filter((e) => e.type === type);
  expect(typeEvents.length).toBe(count);
};

export const expectEventsByUser = (userId: string, count: number) => {
  const userEvents = mockEvents.filter((e) => e.userId === userId);
  expect(userEvents.length).toBe(count);
};

// Error simulation
export const simulateTrackingError = () => {
  mockTrackEvent.mockRejectedValueOnce(new Error('Failed to track event'));
};

export const simulateConfigError = () => {
  mockGetConfig.mockRejectedValueOnce(new Error('Failed to get config'));
};

export const simulateSummaryError = () => {
  mockGetSummary.mockRejectedValueOnce(new Error('Failed to get summary'));
}; 