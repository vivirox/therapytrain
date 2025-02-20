import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CalendarService } from '../CalendarService';
import { GoogleCalendarProvider } from '../providers/GoogleCalendarProvider';
import { OutlookCalendarProvider } from '../providers/OutlookCalendarProvider';
import { ICloudCalendarProvider } from '../providers/ICloudCalendarProvider';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache';
import { CalendarError, CalendarErrorCode } from '../types';
import { TimeSlot } from '@/types/common';
import { Appointment } from '@/types/supabase';

// Mock dependencies
jest.mock('@/lib/logger');
jest.mock('@/lib/cache');
jest.mock('../providers/GoogleCalendarProvider');
jest.mock('../providers/OutlookCalendarProvider');
jest.mock('../providers/ICloudCalendarProvider');

describe('CalendarService', () => {
  let calendarService: CalendarService;
  let mockLogger: jest.Mocked<Logger>;
  let mockCache: jest.Mocked<Cache>;
  let mockGoogleProvider: jest.Mocked<GoogleCalendarProvider>;
  let mockOutlookProvider: jest.Mocked<OutlookCalendarProvider>;
  let mockICloudProvider: jest.Mocked<ICloudCalendarProvider>;

  beforeEach(() => {
    // Reset mocks
    mockLogger = new Logger() as jest.Mocked<Logger>;
    mockCache = new Cache() as jest.Mocked<Cache>;
    mockGoogleProvider = new GoogleCalendarProvider() as jest.Mocked<GoogleCalendarProvider>;
    mockOutlookProvider = new OutlookCalendarProvider() as jest.Mocked<OutlookCalendarProvider>;
    mockICloudProvider = new ICloudCalendarProvider() as jest.Mocked<ICloudCalendarProvider>;

    // Create service instance
    calendarService = new CalendarService(mockLogger, mockCache);

    // Register providers
    calendarService.registerProvider('google', mockGoogleProvider);
    calendarService.registerProvider('outlook', mockOutlookProvider);
    calendarService.registerProvider('icloud', mockICloudProvider);
  });

  describe('getAvailableSlots', () => {
    const testSlots: TimeSlot[] = [
      {
        startTime: new Date('2024-03-01T09:00:00Z'),
        endTime: new Date('2024-03-01T09:50:00Z')
      },
      {
        startTime: new Date('2024-03-01T10:00:00Z'),
        endTime: new Date('2024-03-01T10:50:00Z')
      }
    ];

    it('should return cached slots if available', async () => {
      mockCache.get.mockResolvedValueOnce(testSlots);

      const slots = await calendarService.getAvailableSlots(
        'google',
        'therapist-123',
        new Date('2024-03-01T09:00:00Z'),
        new Date('2024-03-01T17:00:00Z'),
        'UTC'
      );

      expect(slots).toEqual(testSlots);
      expect(mockGoogleProvider.getAvailableSlots).not.toHaveBeenCalled();
    });

    it('should fetch and cache slots if not in cache', async () => {
      mockCache.get.mockResolvedValueOnce(null);
      mockGoogleProvider.getAvailableSlots.mockResolvedValueOnce(testSlots);

      const slots = await calendarService.getAvailableSlots(
        'google',
        'therapist-123',
        new Date('2024-03-01T09:00:00Z'),
        new Date('2024-03-01T17:00:00Z'),
        'UTC'
      );

      expect(slots).toEqual(testSlots);
      expect(mockGoogleProvider.getAvailableSlots).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should throw error for invalid provider', async () => {
      await expect(
        calendarService.getAvailableSlots(
          'invalid-provider',
          'therapist-123',
          new Date('2024-03-01T09:00:00Z'),
          new Date('2024-03-01T17:00:00Z'),
          'UTC'
        )
      ).rejects.toThrow('Calendar provider not found');
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

    it('should schedule appointment if slot is available', async () => {
      mockGoogleProvider.getAvailableSlots.mockResolvedValueOnce([
        {
          startTime: new Date('2024-03-01T09:00:00Z'),
          endTime: new Date('2024-03-01T09:50:00Z')
        }
      ]);

      mockGoogleProvider.scheduleAppointment.mockResolvedValueOnce({
        ...testAppointment,
        id: 'appointment-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const appointment = await calendarService.scheduleAppointment(
        'google',
        testAppointment
      );

      expect(appointment.id).toBe('appointment-123');
      expect(mockGoogleProvider.scheduleAppointment).toHaveBeenCalled();
      expect(mockCache.delete).toHaveBeenCalled();
    });

    it('should throw error if slot is not available', async () => {
      mockGoogleProvider.getAvailableSlots.mockResolvedValueOnce([]);

      await expect(
        calendarService.scheduleAppointment('google', testAppointment)
      ).rejects.toThrow('Selected time slot is not available');
    });
  });

  describe('updateAppointment', () => {
    const testUpdate: Partial<Appointment> = {
      start_time: '2024-03-01T10:00:00Z',
      end_time: '2024-03-01T10:50:00Z',
      metadata: {
        notes: 'Updated session notes'
      }
    };

    it('should update appointment successfully', async () => {
      mockGoogleProvider.updateAppointment.mockResolvedValueOnce({
        id: 'appointment-123',
        ...testUpdate,
        client_id: 'client-123',
        therapist_id: 'therapist-123',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Appointment);

      const appointment = await calendarService.updateAppointment(
        'google',
        'appointment-123',
        testUpdate
      );

      expect(appointment.start_time).toBe(testUpdate.start_time);
      expect(mockGoogleProvider.updateAppointment).toHaveBeenCalled();
      expect(mockCache.deletePattern).toHaveBeenCalled();
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      mockGoogleProvider.cancelAppointment.mockResolvedValueOnce();

      await calendarService.cancelAppointment(
        'google',
        'appointment-123',
        'Client request'
      );

      expect(mockGoogleProvider.cancelAppointment).toHaveBeenCalled();
      expect(mockCache.deletePattern).toHaveBeenCalled();
    });
  });

  describe('syncWithProvider', () => {
    it('should sync calendar data successfully', async () => {
      mockGoogleProvider.sync.mockResolvedValueOnce();

      await calendarService.syncWithProvider('google');

      expect(mockGoogleProvider.sync).toHaveBeenCalled();
      expect(mockCache.deletePattern).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
}); 