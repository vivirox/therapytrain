import { singleton } from 'tsyringe';
import { DateTime } from 'luxon';
import { Schedule, TimeSlot } from '@/types/common';
import { Appointment } from '@/types/supabase';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache';
import { CalendarProvider, ProviderConfig } from './types';
import { GoogleCalendarProvider } from './providers/GoogleCalendarProvider';
import { OutlookCalendarProvider } from './providers/OutlookCalendarProvider';
import { ICloudCalendarProvider } from './providers/ICloudCalendarProvider';
import {
  CalendarProviderNotFoundError,
  CalendarConflictError,
  CalendarSyncError,
  CalendarPropagationError,
  AppointmentNotFoundError,
  InvalidTimeSlotError
} from './errors';

@singleton()
export class CalendarService {
  private providers: Map<string, CalendarProvider>;
  private cache: Cache;
  private logger: Logger;

  constructor(logger: Logger, cache: Cache) {
    this.providers = new Map();
    this.cache = cache;
    this.logger = logger;

    // Initialize default providers
    this.registerProvider('google', new GoogleCalendarProvider());
    this.registerProvider('outlook', new OutlookCalendarProvider());
    this.registerProvider('icloud', new ICloudCalendarProvider());
  }

  /**
   * Register a new calendar provider
   */
  public registerProvider(name: string, provider: CalendarProvider): void {
    this.providers.set(name, provider);
    this.logger.info(`Registered calendar provider: ${name}`);
  }

  /**
   * Configure a calendar provider
   */
  public async configureProvider(name: string, config: ProviderConfig): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${name}`);
    }

    await provider.configure(config);
    this.logger.info(`Configured calendar provider: ${name}`);
  }

  /**
   * Get available time slots for a given date range
   */
  public async getAvailableSlots(
    providerId: string,
    therapistId: string,
    startDate: Date,
    endDate: Date,
    timezone: string
  ): Promise<TimeSlot[]> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${providerId}`);
    }

    const cacheKey = `slots:${providerId}:${therapistId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cachedSlots = await this.cache.get<TimeSlot[]>(cacheKey);
    if (cachedSlots) {
      return cachedSlots;
    }

    const slots = await provider.getAvailableSlots(therapistId, startDate, endDate);
    
    // Convert slots to requested timezone
    const convertedSlots = slots.map(slot => ({
      ...slot,
      startTime: DateTime.fromJSDate(slot.startTime).setZone(timezone).toJSDate(),
      endTime: DateTime.fromJSDate(slot.endTime).setZone(timezone).toJSDate()
    }));

    await this.cache.set(cacheKey, convertedSlots, 300); // Cache for 5 minutes
    return convertedSlots;
  }

  /**
   * Schedule an appointment
   */
  public async scheduleAppointment(
    providerId: string,
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Appointment> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${providerId}`);
    }

    // Validate the appointment time slot is available
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);
    
    const slots = await this.getAvailableSlots(
      providerId,
      appointment.therapist_id,
      startDate,
      endDate,
      appointment.metadata?.timezone as string || 'UTC'
    );

    const isSlotAvailable = slots.some(slot => 
      slot.startTime.getTime() === startDate.getTime() &&
      slot.endTime.getTime() === endDate.getTime()
    );

    if (!isSlotAvailable) {
      throw new Error('Selected time slot is not available');
    }

    // Schedule the appointment with the provider
    const scheduledAppointment = await provider.scheduleAppointment(appointment);

    // Invalidate cached slots
    const cacheKey = `slots:${providerId}:${appointment.therapist_id}:${startDate.toISOString()}:${endDate.toISOString()}`;
    await this.cache.delete(cacheKey);

    return scheduledAppointment;
  }

  /**
   * Update an existing appointment
   */
  public async updateAppointment(
    providerId: string,
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${providerId}`);
    }

    const updatedAppointment = await provider.updateAppointment(appointmentId, updates);

    // Invalidate cached slots if time changed
    if (updates.start_time || updates.end_time) {
      const cacheKey = `slots:${providerId}:${updatedAppointment.therapist_id}:*`;
      await this.cache.deletePattern(cacheKey);
    }

    return updatedAppointment;
  }

  /**
   * Cancel an appointment
   */
  public async cancelAppointment(
    providerId: string,
    appointmentId: string,
    reason?: string
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${providerId}`);
    }

    await provider.cancelAppointment(appointmentId, reason);

    // Invalidate all cached slots for the provider
    const cacheKey = `slots:${providerId}:*`;
    await this.cache.deletePattern(cacheKey);
  }

  /**
   * Get a therapist's schedule
   */
  public async getTherapistSchedule(
    providerId: string,
    therapistId: string,
    startDate: Date,
    endDate: Date,
    timezone: string
  ): Promise<Schedule> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${providerId}`);
    }

    const slots = await this.getAvailableSlots(
      providerId,
      therapistId,
      startDate,
      endDate,
      timezone
    );

    return {
      slots,
      timezone,
      metadata: {
        providerId,
        therapistId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };
  }

  /**
   * Sync calendar data with provider
   */
  public async syncWithProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new CalendarProviderNotFoundError(providerId);
    }

    try {
      await provider.sync();
      this.logger.info(`Synced calendar data with provider: ${providerId}`);
    } catch (error) {
      throw new CalendarSyncError(providerId, error as Error);
    }
  }

  /**
   * Check for appointment conflicts
   */
  private async checkForConflicts(
    providerId: string,
    therapistId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new CalendarProviderNotFoundError(providerId);
    }

    if (startTime >= endTime) {
      throw new InvalidTimeSlotError('Start time must be before end time');
    }

    // Get all slots for the time period
    const slots = await provider.getAvailableSlots(
      therapistId,
      new Date(startTime.getTime() - 60 * 60 * 1000), // Check 1 hour before
      new Date(endTime.getTime() + 60 * 60 * 1000)    // Check 1 hour after
    );

    // Check if the proposed time slot conflicts with any existing appointments
    const proposedStart = DateTime.fromJSDate(startTime);
    const proposedEnd = DateTime.fromJSDate(endTime);

    // A conflict exists if there is no available slot that exactly matches our proposed time
    const hasMatchingSlot = slots.some(slot => 
      DateTime.fromJSDate(slot.startTime).equals(proposedStart) &&
      DateTime.fromJSDate(slot.endTime).equals(proposedEnd)
    );

    return !hasMatchingSlot;
  }

  /**
   * Find alternative slots when there's a conflict
   */
  public async findAlternativeSlots(
    providerId: string,
    therapistId: string,
    preferredStart: Date,
    preferredEnd: Date,
    limit: number = 3
  ): Promise<TimeSlot[]> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Calendar provider not found: ${providerId}`);
    }

    // Look for slots within a week of the preferred time
    const searchStart = new Date(preferredStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const searchEnd = new Date(preferredEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allSlots = await provider.getAvailableSlots(
      therapistId,
      searchStart,
      searchEnd
    );

    // Sort slots by proximity to preferred time
    const preferredDateTime = DateTime.fromJSDate(preferredStart);
    return allSlots
      .sort((a, b) => {
        const diffA = Math.abs(DateTime.fromJSDate(a.startTime).diff(preferredDateTime).as('minutes'));
        const diffB = Math.abs(DateTime.fromJSDate(b.startTime).diff(preferredDateTime).as('minutes'));
        return diffA - diffB;
      })
      .slice(0, limit);
  }

  /**
   * Schedule an appointment with conflict resolution
   */
  public async scheduleAppointmentWithResolution(
    providerId: string,
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>,
    options: {
      allowConflicts?: boolean;
      findAlternatives?: boolean;
    } = {}
  ): Promise<{
    appointment?: Appointment;
    hasConflict: boolean;
    alternativeSlots?: TimeSlot[];
  }> {
    const hasConflict = await this.checkForConflicts(
      providerId,
      appointment.therapist_id,
      new Date(appointment.start_time),
      new Date(appointment.end_time)
    );

    if (hasConflict && !options.allowConflicts) {
      const result: {
        hasConflict: boolean;
        alternativeSlots?: TimeSlot[];
      } = { hasConflict: true };

      if (options.findAlternatives) {
        result.alternativeSlots = await this.findAlternativeSlots(
          providerId,
          appointment.therapist_id,
          new Date(appointment.start_time),
          new Date(appointment.end_time)
        );
      }

      throw new CalendarConflictError(
        `Appointment conflicts with existing schedule${
          result.alternativeSlots ? '. Alternative slots available.' : ''
        }`
      );
    }

    const scheduledAppointment = await this.scheduleAppointment(providerId, appointment);
    return {
      appointment: scheduledAppointment,
      hasConflict: false
    };
  }

  /**
   * Update an appointment with conflict resolution
   */
  public async updateAppointmentWithResolution(
    providerId: string,
    appointmentId: string,
    updates: Partial<Appointment>,
    options: {
      allowConflicts?: boolean;
      findAlternatives?: boolean;
    } = {}
  ): Promise<{
    appointment?: Appointment;
    hasConflict: boolean;
    alternativeSlots?: TimeSlot[];
  }> {
    if (updates.start_time || updates.end_time) {
      const hasConflict = await this.checkForConflicts(
        providerId,
        updates.therapist_id!,
        new Date(updates.start_time || ''),
        new Date(updates.end_time || ''),
        appointmentId
      );

      if (hasConflict && !options.allowConflicts) {
        const result: {
          hasConflict: boolean;
          alternativeSlots?: TimeSlot[];
        } = { hasConflict: true };

        if (options.findAlternatives) {
          result.alternativeSlots = await this.findAlternativeSlots(
            providerId,
            updates.therapist_id!,
            new Date(updates.start_time || ''),
            new Date(updates.end_time || '')
          );
        }

        throw new CalendarConflictError(
          `Appointment conflicts with existing schedule${
            result.alternativeSlots ? '. Alternative slots available.' : ''
          }`
        );
      }
    }

    const updatedAppointment = await this.updateAppointment(providerId, appointmentId, updates);
    return {
      appointment: updatedAppointment,
      hasConflict: false
    };
  }

  /**
   * Propagate appointment updates across providers
   */
  private async propagateAppointmentUpdate(
    sourceProviderId: string,
    appointment: Appointment,
    action: 'create' | 'update' | 'delete'
  ): Promise<void> {
    const updatePromises = Array.from(this.providers.entries())
      .filter(([providerId]) => providerId !== sourceProviderId)
      .map(async ([providerId, provider]) => {
        try {
          switch (action) {
            case 'create':
              await provider.scheduleAppointment(appointment);
              break;
            case 'update':
              await provider.updateAppointment(appointment.id, appointment);
              break;
            case 'delete':
              await provider.cancelAppointment(appointment.id);
              break;
          }
          this.logger.info(`Successfully propagated ${action} to provider: ${providerId}`);
        } catch (error) {
          const propagationError = new CalendarPropagationError(providerId, action, error as Error);
          this.logger.error(propagationError.message);
          throw propagationError;
        }
      });

    await Promise.all(updatePromises);
  }

  /**
   * Schedule appointment with propagation
   */
  public async scheduleAppointmentWithPropagation(
    providerId: string,
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>,
    options: {
      allowConflicts?: boolean;
      findAlternatives?: boolean;
      propagateToOtherProviders?: boolean;
    } = {}
  ): Promise<{
    appointment?: Appointment;
    hasConflict: boolean;
    alternativeSlots?: TimeSlot[];
  }> {
    const result = await this.scheduleAppointmentWithResolution(providerId, appointment, options);

    if (result.appointment && options.propagateToOtherProviders) {
      await this.propagateAppointmentUpdate(providerId, result.appointment, 'create');
    }

    return result;
  }

  /**
   * Update appointment with propagation
   */
  public async updateAppointmentWithPropagation(
    providerId: string,
    appointmentId: string,
    updates: Partial<Appointment>,
    options: {
      allowConflicts?: boolean;
      findAlternatives?: boolean;
      propagateToOtherProviders?: boolean;
    } = {}
  ): Promise<{
    appointment?: Appointment;
    hasConflict: boolean;
    alternativeSlots?: TimeSlot[];
  }> {
    const result = await this.updateAppointmentWithResolution(providerId, appointmentId, updates, options);

    if (result.appointment && options.propagateToOtherProviders) {
      await this.propagateAppointmentUpdate(providerId, result.appointment, 'update');
    }

    return result;
  }

  /**
   * Cancel appointment with propagation
   */
  public async cancelAppointmentWithPropagation(
    providerId: string,
    appointmentId: string,
    options: {
      propagateToOtherProviders?: boolean;
    } = {}
  ): Promise<void> {
    const appointment = await this.getAppointment(providerId, appointmentId);
    await this.cancelAppointment(providerId, appointmentId);

    if (options.propagateToOtherProviders && appointment) {
      await this.propagateAppointmentUpdate(providerId, appointment, 'delete');
    }
  }

  public async getAppointment(providerId: string, appointmentId: string): Promise<Appointment> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new CalendarProviderNotFoundError(providerId);
    }

    const appointment = await provider.getAppointment(appointmentId);
    if (!appointment) {
      throw new AppointmentNotFoundError(appointmentId);
    }

    return appointment;
  }
} 