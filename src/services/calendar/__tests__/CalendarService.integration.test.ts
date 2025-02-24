import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { CalendarService } from '../CalendarService';
import { GoogleCalendarProvider } from '../providers/GoogleCalendarProvider';
import { OutlookCalendarProvider } from '../providers/OutlookCalendarProvider';
import { ICloudCalendarProvider } from '../providers/ICloudCalendarProvider';
import { Logger } from '@/utils/logger';
import { Appointment } from '@/types';
import {
  CalendarProviderNotFoundError,
  CalendarConflictError,
  CalendarSyncError,
  CalendarPropagationError,
  AppointmentNotFoundError
} from '../errors';

describe('CalendarService Integration Tests', () => {
  let calendarService: CalendarService;
  let mockLogger: jest.Mocked<Logger>;
  let mockGoogleProvider: jest.Mocked<GoogleCalendarProvider>;
  let mockOutlookProvider: jest.Mocked<OutlookCalendarProvider>;
  let mockICloudProvider: jest.Mocked<ICloudCalendarProvider>;

  const mockAppointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> = {
    therapist_id: 'therapist-1',
    client_id: 'client-1',
    start_time: new Date('2024-04-01T10:00:00Z').toISOString(),
    end_time: new Date('2024-04-01T11:00:00Z').toISOString(),
    status: 'scheduled',
    type: 'therapy',
    notes: 'Test appointment'
  };

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockGoogleProvider = {
      getAvailableSlots: jest.fn(),
      scheduleAppointment: jest.fn(),
      updateAppointment: jest.fn(),
      cancelAppointment: jest.fn(),
      getAppointment: jest.fn(),
      sync: jest.fn()
    };

    mockOutlookProvider = {
      getAvailableSlots: jest.fn(),
      scheduleAppointment: jest.fn(),
      updateAppointment: jest.fn(),
      cancelAppointment: jest.fn(),
      getAppointment: jest.fn(),
      sync: jest.fn()
    };

    mockICloudProvider = {
      getAvailableSlots: jest.fn(),
      scheduleAppointment: jest.fn(),
      updateAppointment: jest.fn(),
      cancelAppointment: jest.fn(),
      getAppointment: jest.fn(),
      sync: jest.fn()
    };

    calendarService = new CalendarService(mockLogger);
    calendarService.registerProvider('google', mockGoogleProvider);
    calendarService.registerProvider('outlook', mockOutlookProvider);
    calendarService.registerProvider('icloud', mockICloudProvider);
  });

  describe('Conflict Resolution', () => {
    test('should detect conflicts and suggest alternatives', async () => {
      const availableSlots = [
        {
          startTime: new Date('2024-04-01T14:00:00Z'),
          endTime: new Date('2024-04-01T15:00:00Z')
        },
        {
          startTime: new Date('2024-04-01T15:00:00Z'),
          endTime: new Date('2024-04-01T16:00:00Z')
        }
      ];

      mockGoogleProvider.getAvailableSlots.mockResolvedValue(availableSlots);

      await expect(
        calendarService.scheduleAppointmentWithResolution('google', mockAppointment, {
          findAlternatives: true
        })
      ).rejects.toThrow(CalendarConflictError);

      expect(mockGoogleProvider.getAvailableSlots).toHaveBeenCalled();
    });

    test('should allow scheduling when no conflicts exist', async () => {
      const availableSlots = [
        {
          startTime: new Date('2024-04-01T10:00:00Z'),
          endTime: new Date('2024-04-01T11:00:00Z')
        }
      ];

      mockGoogleProvider.getAvailableSlots.mockResolvedValue(availableSlots);
      mockGoogleProvider.scheduleAppointment.mockResolvedValue({
        ...mockAppointment,
        id: 'test-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await calendarService.scheduleAppointmentWithResolution('google', mockAppointment);
      expect(result.hasConflict).toBe(false);
      expect(result.appointment).toBeDefined();
    });
  });

  describe('Update Propagation', () => {
    test('should propagate updates to all providers', async () => {
      const scheduledAppointment = {
        ...mockAppointment,
        id: 'test-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockGoogleProvider.getAvailableSlots.mockResolvedValue([
        {
          startTime: new Date('2024-04-01T10:00:00Z'),
          endTime: new Date('2024-04-01T11:00:00Z')
        }
      ]);
      mockGoogleProvider.scheduleAppointment.mockResolvedValue(scheduledAppointment);
      mockOutlookProvider.scheduleAppointment.mockResolvedValue(scheduledAppointment);
      mockICloudProvider.scheduleAppointment.mockResolvedValue(scheduledAppointment);

      const result = await calendarService.scheduleAppointmentWithPropagation(
        'google',
        mockAppointment,
        { propagateToOtherProviders: true }
      );

      expect(result.appointment).toBeDefined();
      expect(mockOutlookProvider.scheduleAppointment).toHaveBeenCalled();
      expect(mockICloudProvider.scheduleAppointment).toHaveBeenCalled();
    });

    test('should handle propagation failures gracefully', async () => {
      const scheduledAppointment = {
        ...mockAppointment,
        id: 'test-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockGoogleProvider.getAvailableSlots.mockResolvedValue([
        {
          startTime: new Date('2024-04-01T10:00:00Z'),
          endTime: new Date('2024-04-01T11:00:00Z')
        }
      ]);
      mockGoogleProvider.scheduleAppointment.mockResolvedValue(scheduledAppointment);
      mockOutlookProvider.scheduleAppointment.mockRejectedValue(new Error('Propagation failed'));

      await expect(
        calendarService.scheduleAppointmentWithPropagation('google', mockAppointment, {
          propagateToOtherProviders: true
        })
      ).rejects.toThrow(CalendarPropagationError);
    });
  });

  describe('Error Handling', () => {
    test('should handle provider not found', async () => {
      await expect(
        calendarService.scheduleAppointmentWithResolution('invalid-provider', mockAppointment)
      ).rejects.toThrow(CalendarProviderNotFoundError);
    });

    test('should handle appointment not found', async () => {
      mockGoogleProvider.getAppointment.mockResolvedValue(null);

      await expect(
        calendarService.getAppointment('google', 'invalid-id')
      ).rejects.toThrow(AppointmentNotFoundError);
    });

    test('should handle sync errors', async () => {
      mockGoogleProvider.sync.mockRejectedValue(new Error('Sync failed'));

      await expect(
        calendarService.syncWithProvider('google')
      ).rejects.toThrow(CalendarSyncError);
    });
  });
}); 