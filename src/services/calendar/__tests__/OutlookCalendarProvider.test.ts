import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { Client, GraphRequest } from '@microsoft/microsoft-graph-client';
import { DateTime } from 'luxon';
import { OutlookCalendarProvider } from '../providers/OutlookCalendarProvider';
import { AppointmentStatus } from '@/types/common';

// Mock the Microsoft Graph Client
jest.mock('@microsoft/microsoft-graph-client');

// Mock the Logger
jest.mock('@/utils/logger');

// Create a mock factory for Graph client requests
const createMockGraphRequest = () => {
  const request = {
    get: jest.fn() as jest.MockedFunction<GraphRequest['get']>,
    post: jest.fn() as jest.MockedFunction<GraphRequest['post']>,
    patch: jest.fn() as jest.MockedFunction<GraphRequest['patch']>,
    delete: jest.fn() as jest.MockedFunction<GraphRequest['delete']>
  };

  // Pre-configure mock methods with default responses
  request.get.mockResolvedValue({ value: [] });
  request.post.mockResolvedValue({});
  request.patch.mockResolvedValue({});
  request.delete.mockResolvedValue({});

  return request;
};

describe('OutlookCalendarProvider', () => {
  let provider: OutlookCalendarProvider;
  let mockGraphClient: jest.Mocked<Client>;
  let mockRequest: ReturnType<typeof createMockGraphRequest>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockRequest = createMockGraphRequest();
    mockGraphClient = {
      api: jest.fn().mockReturnValue(mockRequest)
    } as unknown as jest.Mocked<Client>;

    ((Client as unknown) as jest.Mock).mockImplementation(() => mockGraphClient);

    // Set up default mock implementations
    mockRequest.get.mockImplementation(() => Promise.resolve({ value: [] }));
    mockRequest.post.mockImplementation(() => Promise.resolve({}));
    mockRequest.patch.mockImplementation(() => Promise.resolve({}));
    mockRequest.delete.mockImplementation(() => Promise.resolve({}));

    // Update test cases to use direct mock implementations instead of mockResolvedValueOnce
    // In getAvailableSlots test
    mockRequest.get.mockImplementationOnce(() => Promise.resolve({ value: [] }));

    // In scheduleAppointment test
    mockRequest.post.mockImplementationOnce(() => Promise.resolve({}));

    // In scheduleAppointment error test
    mockRequest.post.mockImplementationOnce(() => Promise.reject(new Error('Failed to schedule')));

    provider = new OutlookCalendarProvider();
  });

  describe('configure', () => {
    test('should configure the provider with valid credentials', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      };

      await provider.configure(config);
      expect(Client).toHaveBeenCalled();
    });

    test('should throw error with invalid configuration', async () => {
      const invalidConfig = {
        clientId: '',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      };

      await expect(provider.configure(invalidConfig)).rejects.toThrow();
    });
  });

  describe('getAvailableSlots', () => {
    const startDate = new Date('2024-03-20T00:00:00Z');
    const endDate = new Date('2024-03-21T00:00:00Z');
    const therapistId = 'test-therapist-id';

    beforeEach(async () => {
      await provider.configure({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      });
    });

    test('should return available slots when no events exist', async () => {
      mockRequest.get.mockResolvedValueOnce({ value: [] });

      const slots = await provider.getAvailableSlots(therapistId, startDate, endDate);
      expect(slots.length).toBeGreaterThan(0);
      expect(mockGraphClient.api).toHaveBeenCalledWith(`/users/${therapistId}/calendar/calendarView`);
    });

    test('should handle busy slots correctly', async () => {
      mockRequest.get.mockResolvedValueOnce({
        value: [{
          start: { dateTime: '2024-03-20T10:00:00Z' },
          end: { dateTime: '2024-03-20T11:00:00Z' },
        }]
      });

      const slots = await provider.getAvailableSlots(therapistId, startDate, endDate);
      expect(slots).not.toContainEqual({
        startTime: DateTime.fromISO('2024-03-20T10:00:00Z').toJSDate(),
        endTime: DateTime.fromISO('2024-03-20T11:00:00Z').toJSDate(),
      });
    });

    test('should handle API errors', async () => {
      mockRequest.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(provider.getAvailableSlots(therapistId, startDate, endDate))
        .rejects.toMatchObject({
          code: 'API_ERROR',
        });
    });
  });

  describe('scheduleAppointment', () => {
    const appointment = {
      therapist_id: 'test-therapist-id',
      client_id: 'test-client-id',
      start_time: '2024-03-20T10:00:00Z',
      end_time: '2024-03-20T11:00:00Z',
      status: AppointmentStatus.SCHEDULED,
      metadata: {
        client_name: 'Test Client',
        client_email: 'client@example.com',
        therapist_email: 'therapist@example.com',
        notes: 'Regular therapy session',
        timezone: 'UTC'
      }
    } as const;

    beforeEach(async () => {
      await provider.configure({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      });
    });

    test('should schedule appointment successfully', async () => {
      const mockEventResponse = {
        id: 'test-event-id',
        subject: appointment.metadata.client_name,
      };

      mockRequest.post.mockResolvedValueOnce(mockEventResponse);

      const result = await provider.scheduleAppointment(appointment);
      expect(result).toBeDefined();
      expect(result.id).toBe('test-event-id');
      expect(mockGraphClient.api).toHaveBeenCalledWith(`/users/${appointment.therapist_id}/calendar/events`);
    });

    test('should handle scheduling errors', async () => {
      mockRequest.post.mockRejectedValueOnce(new Error('Scheduling Error'));

      await expect(provider.scheduleAppointment(appointment))
        .rejects.toMatchObject({
          code: 'SCHEDULING_ERROR',
        });
    });
  });

  describe('updateAppointment', () => {
    const appointmentId = 'test-appointment-id';
    const therapistId = 'test-therapist-id';
    const updates = {
      start_time: '2024-03-20T11:00:00Z',
      end_time: '2024-03-20T12:00:00Z',
      metadata: {
        notes: 'Updated Session',
        timezone: 'UTC'
      }
    } as const;

    beforeEach(async () => {
      await provider.configure({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      });
    });

    test('should update appointment successfully', async () => {
      mockRequest.patch.mockResolvedValueOnce({});

      await provider.updateAppointment(appointmentId, updates);
      expect(mockGraphClient.api).toHaveBeenCalledWith(`/users/${therapistId}/calendar/events/${appointmentId}`);
    });

    test('should handle update errors', async () => {
      mockRequest.patch.mockRejectedValueOnce(new Error('Update Error'));

      await expect(provider.updateAppointment(appointmentId, updates))
        .rejects.toMatchObject({
          code: 'UPDATE_ERROR',
        });
    });
  });

  describe('cancelAppointment', () => {
    const appointmentId = 'test-appointment-id';
    const therapistId = 'test-therapist-id';
    const reason = 'Client requested cancellation';

    beforeEach(async () => {
      await provider.configure({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      });
    });

    test('should cancel appointment successfully', async () => {
      mockRequest.delete.mockResolvedValueOnce({});

      await provider.cancelAppointment(appointmentId, reason);
      expect(mockGraphClient.api).toHaveBeenCalledWith(`/users/${therapistId}/calendar/events/${appointmentId}`);
    });

    test('should handle cancellation errors', async () => {
      mockRequest.delete.mockRejectedValueOnce(new Error('Cancellation Error'));

      await expect(provider.cancelAppointment(appointmentId, reason))
        .rejects.toMatchObject({
          code: 'CANCELLATION_ERROR',
        });
    });
  });

  describe('sync', () => {
    beforeEach(async () => {
      await provider.configure({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['calendars.readwrite'],
      });
    });

    test('should sync calendar data successfully', async () => {
      const mockEvents = {
        value: [
          {
            id: 'event-1',
            subject: 'Test Event 1',
            start: { dateTime: '2024-03-20T10:00:00Z' },
            end: { dateTime: '2024-03-20T11:00:00Z' },
          },
        ],
      };

      mockRequest.get.mockResolvedValueOnce(mockEvents);

      const result = await provider.sync();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle sync errors', async () => {
      mockRequest.get.mockRejectedValueOnce(new Error('Sync Error'));

      await expect(provider.sync())
        .rejects.toMatchObject({
          code: 'SYNC_ERROR',
        });
    });
  });
}); 