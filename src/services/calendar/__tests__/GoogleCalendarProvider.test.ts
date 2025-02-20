import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { google } from 'googleapis';
import { GoogleCalendarProvider } from '../providers/GoogleCalendarProvider';
import { CalendarError, CalendarErrorCode, ProviderConfig } from '../types';
import { Appointment } from '@/types/supabase';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn()
      }))
    },
    calendar: jest.fn().mockReturnValue({
      freebusy: {
        query: jest.fn()
      },
      events: {
        insert: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn()
      }
    })
  }
}));

describe('GoogleCalendarProvider', () => {
  let provider: GoogleCalendarProvider;
  let mockCalendar: any;
  const testConfig: ProviderConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/auth/callback',
    scopes: ['https://www.googleapis.com/auth/calendar']
  };

  beforeEach(() => {
    provider = new GoogleCalendarProvider();
    mockCalendar = google.calendar();
  });

  describe('configure', () => {
    it('should configure provider successfully', async () => {
      await provider.configure(testConfig);
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        testConfig.clientId,
        testConfig.clientSecret,
        testConfig.redirectUri
      );
    });

    it('should handle configuration error', async () => {
      const error = new Error('Configuration failed');
      (google.auth.OAuth2 as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      await expect(provider.configure(testConfig)).rejects.toThrow(
        new CalendarError({
          message: 'Failed to configure Google Calendar provider',
          code: CalendarErrorCode.CONFIGURATION_ERROR,
          details: { error }
        })
      );
    });
  });

  describe('getAvailableSlots', () => {
    beforeEach(async () => {
      await provider.configure(testConfig);
    });

    it('should return available slots', async () => {
      const startDate = new Date('2024-03-01T09:00:00Z');
      const endDate = new Date('2024-03-01T17:00:00Z');
      const busySlots = [
        {
          start: '2024-03-01T10:00:00Z',
          end: '2024-03-01T11:00:00Z'
        }
      ];

      mockCalendar.freebusy.query.mockResolvedValueOnce({
        data: {
          calendars: {
            'therapist_123@group.calendar.google.com': {
              busy: busySlots
            }
          }
        }
      });

      const slots = await provider.getAvailableSlots('123', startDate, endDate);
      expect(slots.length).toBeGreaterThan(0);
      expect(mockCalendar.freebusy.query).toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      mockCalendar.freebusy.query.mockRejectedValueOnce(new Error('API error'));

      await expect(
        provider.getAvailableSlots(
          '123',
          new Date('2024-03-01T09:00:00Z'),
          new Date('2024-03-01T17:00:00Z')
        )
      ).rejects.toThrow(
        new CalendarError({
          message: 'Failed to get available slots',
          code: CalendarErrorCode.INTERNAL_ERROR,
          details: { error: new Error('API error') }
        })
      );
    });
  });

  describe('scheduleAppointment', () => {
    const testAppointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> = {
      client_id: 'client-123',
      therapist_id: 'therapist-123',
      start_time: '2024-03-01T09:00:00Z',
      end_time: '2024-03-01T09:50:00Z',
      status: 'scheduled',
      metadata: {
        client_name: 'John Doe',
        client_email: 'john@example.com',
        therapist_email: 'therapist@example.com',
        timezone: 'UTC'
      }
    };

    beforeEach(async () => {
      await provider.configure(testConfig);
    });

    it('should schedule appointment successfully', async () => {
      mockCalendar.events.insert.mockResolvedValueOnce({
        data: {
          id: 'event-123',
          status: 'confirmed'
        }
      });

      const appointment = await provider.scheduleAppointment(testAppointment);
      expect(appointment.id).toBe('event-123');
      expect(mockCalendar.events.insert).toHaveBeenCalled();
    });

    it('should handle scheduling error', async () => {
      mockCalendar.events.insert.mockRejectedValueOnce(new Error('API error'));

      await expect(
        provider.scheduleAppointment(testAppointment)
      ).rejects.toThrow(
        new CalendarError({
          message: 'Failed to schedule appointment',
          code: CalendarErrorCode.INTERNAL_ERROR,
          details: { error: new Error('API error') }
        })
      );
    });
  });

  describe('updateAppointment', () => {
    const testUpdate: Partial<Appointment> = {
      start_time: '2024-03-01T10:00:00Z',
      end_time: '2024-03-01T10:50:00Z',
      metadata: {
        notes: 'Updated session notes',
        google_event_id: 'event-123'
      }
    };

    beforeEach(async () => {
      await provider.configure(testConfig);
    });

    it('should update appointment successfully', async () => {
      mockCalendar.events.patch.mockResolvedValueOnce({
        data: {
          id: 'event-123',
          status: 'confirmed'
        }
      });

      const appointment = await provider.updateAppointment('event-123', testUpdate);
      expect(appointment.id).toBe('event-123');
      expect(mockCalendar.events.patch).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      mockCalendar.events.patch.mockRejectedValueOnce(new Error('API error'));

      await expect(
        provider.updateAppointment('event-123', testUpdate)
      ).rejects.toThrow(
        new CalendarError({
          message: 'Failed to update appointment',
          code: CalendarErrorCode.INTERNAL_ERROR,
          details: { error: new Error('API error') }
        })
      );
    });
  });

  describe('cancelAppointment', () => {
    beforeEach(async () => {
      await provider.configure(testConfig);
    });

    it('should cancel appointment successfully', async () => {
      mockCalendar.events.delete.mockResolvedValueOnce({});

      await provider.cancelAppointment('event-123', 'Client request');
      expect(mockCalendar.events.delete).toHaveBeenCalled();
    });

    it('should handle cancellation error', async () => {
      mockCalendar.events.delete.mockRejectedValueOnce(new Error('API error'));

      await expect(
        provider.cancelAppointment('event-123', 'Client request')
      ).rejects.toThrow(
        new CalendarError({
          message: 'Failed to cancel appointment',
          code: CalendarErrorCode.INTERNAL_ERROR,
          details: { error: new Error('API error') }
        })
      );
    });
  });
}); 