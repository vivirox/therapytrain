import { Appointment } from '@/types/supabase';
import { TimeSlot } from '@/types/common';

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  additionalConfig?: Record<string, unknown>;
}

export interface CalendarProvider {
  /**
   * Configure the calendar provider with necessary credentials
   */
  configure(config: ProviderConfig): Promise<void>;

  /**
   * Get available time slots for a given date range
   */
  getAvailableSlots(
    therapistId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]>;

  /**
   * Schedule a new appointment
   */
  scheduleAppointment(
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Appointment>;

  /**
   * Update an existing appointment
   */
  updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<Appointment>;

  /**
   * Cancel an appointment
   */
  cancelAppointment(appointmentId: string, reason?: string): Promise<void>;

  /**
   * Sync calendar data with the provider
   */
  sync(): Promise<void>;
}

export interface CalendarError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

export enum CalendarErrorCode {
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SLOT_NOT_AVAILABLE = 'SLOT_NOT_AVAILABLE',
  APPOINTMENT_NOT_FOUND = 'APPOINTMENT_NOT_FOUND',
  SYNC_ERROR = 'SYNC_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
} 