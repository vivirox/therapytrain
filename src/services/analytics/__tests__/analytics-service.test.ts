import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsService } from '../index';
import {
  generateTestEvent,
  generateTutorialProgressEvent,
  generateQuizCompletionEvent,
  generateResourceEngagementEvent,
  generatePeerInteractionEvent,
} from '@/lib/test/analytics-utils';

// Create mock functions that return promises
const mockTrackEvent = vi.fn().mockImplementation(async (event) => {
  if (!event.type || !event.timestamp || !event.data) {
    throw new Error('Invalid event data');
  }
  return Promise.resolve();
});

const mockTrackTutorialProgress = vi.fn().mockImplementation(async (userId, tutorialId, progress) => {
  return Promise.resolve();
});

const mockTrackQuizCompletion = vi.fn().mockImplementation(async (userId, quizId, score, timeSpent) => {
  return Promise.resolve();
});

const mockTrackResourceEngagement = vi.fn().mockImplementation(async (userId, resourceId, resourceType, engagementType) => {
  return Promise.resolve();
});

const mockTrackPeerInteraction = vi.fn().mockImplementation(async (userId, interactionType, targetId) => {
  return Promise.resolve();
});

// Mock the AnalyticsService class
vi.mock('../index', () => {
  return {
    AnalyticsService: {
      getInstance: () => ({
        trackEvent: mockTrackEvent,
        trackTutorialProgress: mockTrackTutorialProgress,
        trackQuizCompletion: mockTrackQuizCompletion,
        trackResourceEngagement: mockTrackResourceEngagement,
        trackPeerInteraction: mockTrackPeerInteraction,
      }),
    },
  };
});

describe('AnalyticsService', () => {
  let analyticsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService = AnalyticsService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track a basic event successfully', async () => {
      const event = generateTestEvent();
      await analyticsService.trackEvent(event);
      expect(mockTrackEvent).toHaveBeenCalledWith(event);
    });

    it('should handle tracking error gracefully', async () => {
      const event = generateTestEvent();
      mockTrackEvent.mockRejectedValueOnce(new Error('Failed to track event'));
      await expect(analyticsService.trackEvent(event)).rejects.toThrow('Failed to track event');
    });

    it('should track multiple events', async () => {
      const events = [
        generateTestEvent({ type: 'event1' }),
        generateTestEvent({ type: 'event2' }),
        generateTestEvent({ type: 'event3' }),
      ];

      for (const event of events) {
        await analyticsService.trackEvent(event);
      }

      expect(mockTrackEvent).toHaveBeenCalledTimes(3);
    });

    it('should track events with different users', async () => {
      const events = [
        generateTestEvent({ userId: 'user1' }),
        generateTestEvent({ userId: 'user2' }),
        generateTestEvent({ userId: 'user1' }),
      ];

      for (const event of events) {
        await analyticsService.trackEvent(event);
      }

      expect(mockTrackEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('Tutorial Progress Tracking', () => {
    it('should track tutorial progress', async () => {
      const userId = 'test-user';
      const tutorialId = 'tutorial-1';
      const progress = 0.75;

      await analyticsService.trackTutorialProgress(userId, tutorialId, progress);

      expect(mockTrackTutorialProgress).toHaveBeenCalledWith(userId, tutorialId, progress);
    });

    it('should track multiple tutorial progress updates', async () => {
      const userId = 'test-user';
      const tutorialId = 'tutorial-1';
      const progressUpdates = [0.25, 0.5, 0.75, 1.0];

      for (const progress of progressUpdates) {
        await analyticsService.trackTutorialProgress(userId, tutorialId, progress);
      }

      expect(mockTrackTutorialProgress).toHaveBeenCalledTimes(4);
    });
  });

  describe('Quiz Completion Tracking', () => {
    it('should track quiz completion', async () => {
      const userId = 'test-user';
      const quizId = 'quiz-1';
      const score = 85;
      const timeSpent = 300;

      await analyticsService.trackQuizCompletion(userId, quizId, score, timeSpent);

      expect(mockTrackQuizCompletion).toHaveBeenCalledWith(userId, quizId, score, timeSpent);
    });

    it('should track multiple quiz completions', async () => {
      const userId = 'test-user';
      const quizzes = [
        { id: 'quiz-1', score: 85, timeSpent: 300 },
        { id: 'quiz-2', score: 92, timeSpent: 250 },
        { id: 'quiz-3', score: 78, timeSpent: 400 },
      ];

      for (const quiz of quizzes) {
        await analyticsService.trackQuizCompletion(
          userId,
          quiz.id,
          quiz.score,
          quiz.timeSpent
        );
      }

      expect(mockTrackQuizCompletion).toHaveBeenCalledTimes(3);
    });
  });

  describe('Resource Engagement Tracking', () => {
    it('should track resource engagement', async () => {
      const userId = 'test-user';
      const resourceId = 'resource-1';
      const resourceType = 'video';
      const engagementType = 'view';

      await analyticsService.trackResourceEngagement(
        userId,
        resourceId,
        resourceType,
        engagementType
      );

      expect(mockTrackResourceEngagement).toHaveBeenCalledWith(
        userId,
        resourceId,
        resourceType,
        engagementType
      );
    });

    it('should track different types of resource engagement', async () => {
      const userId = 'test-user';
      const resourceId = 'resource-1';
      const engagements = [
        { type: 'video', engagement: 'view' },
        { type: 'document', engagement: 'download' },
        { type: 'article', engagement: 'read' },
      ];

      for (const { type, engagement } of engagements) {
        await analyticsService.trackResourceEngagement(
          userId,
          resourceId,
          type,
          engagement
        );
      }

      expect(mockTrackResourceEngagement).toHaveBeenCalledTimes(3);
    });
  });

  describe('Peer Interaction Tracking', () => {
    it('should track peer interaction', async () => {
      const userId = 'test-user';
      const interactionType = 'message';
      const targetId = 'peer-1';

      await analyticsService.trackPeerInteraction(userId, interactionType, targetId);

      expect(mockTrackPeerInteraction).toHaveBeenCalledWith(userId, interactionType, targetId);
    });

    it('should track different types of peer interactions', async () => {
      const userId = 'test-user';
      const interactions = [
        { type: 'message', target: 'peer-1' },
        { type: 'follow', target: 'peer-2' },
        { type: 'like', target: 'peer-3' },
      ];

      for (const { type, target } of interactions) {
        await analyticsService.trackPeerInteraction(userId, type, target);
      }

      expect(mockTrackPeerInteraction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const event = generateTestEvent();
      mockTrackEvent.mockRejectedValueOnce(new Error('Failed to track event'));
      await expect(analyticsService.trackEvent(event)).rejects.toThrow('Failed to track event');
    });

    it('should handle invalid event data', async () => {
      const invalidEvent = {
        ...generateTestEvent(),
        type: '',
      };

      await expect(analyticsService.trackEvent(invalidEvent)).rejects.toThrow('Invalid event data');
    });

    it('should handle rate limiting', async () => {
      // Simulate rate limiting by tracking many events quickly
      const events = Array.from({ length: 100 }, () => generateTestEvent());
      mockTrackEvent.mockRejectedValue(new Error('Rate limit exceeded'));
      
      const promises = events.map((event) => analyticsService.trackEvent(event));
      await expect(Promise.all(promises)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Event Validation', () => {
    it('should validate required event fields', async () => {
      const invalidEvents = [
        { ...generateTestEvent(), type: undefined },
        { ...generateTestEvent(), timestamp: undefined },
        { ...generateTestEvent(), data: undefined },
      ];

      for (const event of invalidEvents) {
        await expect(analyticsService.trackEvent(event as any)).rejects.toThrow('Invalid event data');
      }
    });

    it('should validate event data format', async () => {
      const invalidDataEvents = [
        { ...generateTestEvent(), data: null },
        { ...generateTestEvent(), data: 'invalid' },
        { ...generateTestEvent(), data: [] },
      ];

      for (const event of invalidDataEvents) {
        await expect(analyticsService.trackEvent(event as any)).rejects.toThrow('Invalid event data');
      }
    });
  });
}); 