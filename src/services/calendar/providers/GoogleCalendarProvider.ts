import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { DateTime } from 'luxon';
import { CalendarProvider, ProviderConfig, CalendarError, CalendarErrorCode } from '../types';
import { Appointment } from '@/types/supabase';
import { TimeSlot } from '@/types/common';

export class GoogleCalendarProvider implements CalendarProvider {
  private oauth2Client: OAuth2Client | null = null;
  private calendar: calendar_v3.Calendar | null = null;

  async configure(config: ProviderConfig): Promise<void> {
    try {
      this.oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      // Set credentials if provided in additional config
      if (config.additionalConfig?.credentials) {
        this.oauth2Client.setCredentials(config.additionalConfig.credentials as any);
      }

      this.calendar = google.calendar({
        version: 'v3',
        auth: this.oauth2Client
      });
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to configure Google Calendar provider',
        code: CalendarErrorCode.CONFIGURATION_ERROR,
        details: { error }
      });
    }
  }

  async getAvailableSlots(
    therapistId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSlot[]> {
    if (!this.calendar) {
      throw new CalendarError({
        message: 'Google Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      // Get therapist's calendar ID from metadata
      const calendarId = await this.getTherapistCalendarId(therapistId);

      // Get busy slots from Google Calendar
      const freeBusyResponse = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: calendarId }]
        }
      });

      const busySlots = freeBusyResponse.data.calendars?.[calendarId]?.busy || [];

      // Convert busy slots to available slots
      return this.calculateAvailableSlots(startDate, endDate, busySlots);
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to get available slots',
        code: CalendarErrorCode.INTERNAL_ERROR,
        details: { error }
      });
    }
  }

  async scheduleAppointment(
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Appointment> {
    if (!this.calendar) {
      throw new CalendarError({
        message: 'Google Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const calendarId = await this.getTherapistCalendarId(appointment.therapist_id);

      // Create event in Google Calendar
      const event = await this.calendar.events.insert({
        calendarId,
        requestBody: {
          summary: `Therapy Session with ${appointment.metadata?.client_name || 'Client'}`,
          description: appointment.metadata?.notes,
          start: {
            dateTime: appointment.start_time,
            timeZone: appointment.metadata?.timezone as string || 'UTC'
          },
          end: {
            dateTime: appointment.end_time,
            timeZone: appointment.metadata?.timezone as string || 'UTC'
          },
          attendees: [
            { email: appointment.metadata?.client_email },
            { email: appointment.metadata?.therapist_email }
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 24 hours
              { method: 'popup', minutes: 30 } // 30 minutes
            ]
          }
        }
      });

      // Convert Google Calendar event to Appointment
      return {
        id: event.data.id!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: appointment.client_id,
        therapist_id: appointment.therapist_id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        metadata: {
          ...appointment.metadata,
          google_event_id: event.data.id,
          google_calendar_id: calendarId
        }
      };
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to schedule appointment',
        code: CalendarErrorCode.INTERNAL_ERROR,
        details: { error }
      });
    }
  }

  async updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    if (!this.calendar) {
      throw new CalendarError({
        message: 'Google Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const calendarId = await this.getTherapistCalendarId(updates.therapist_id!);
      const eventId = updates.metadata?.google_event_id;

      if (!eventId) {
        throw new CalendarError({
          message: 'Google Calendar event ID not found',
          code: CalendarErrorCode.APPOINTMENT_NOT_FOUND
        });
      }

      // Update event in Google Calendar
      const event = await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          start: updates.start_time ? {
            dateTime: updates.start_time,
            timeZone: updates.metadata?.timezone as string || 'UTC'
          } : undefined,
          end: updates.end_time ? {
            dateTime: updates.end_time,
            timeZone: updates.metadata?.timezone as string || 'UTC'
          } : undefined,
          description: updates.metadata?.notes
        }
      });

      // Return updated appointment
      return {
        ...updates,
        id: appointmentId,
        updated_at: new Date().toISOString(),
        metadata: {
          ...updates.metadata,
          google_event_id: event.data.id,
          google_calendar_id: calendarId
        }
      } as Appointment;
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to update appointment',
        code: CalendarErrorCode.INTERNAL_ERROR,
        details: { error }
      });
    }
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    if (!this.calendar) {
      throw new CalendarError({
        message: 'Google Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const appointment = await this.getAppointment(appointmentId);
      const calendarId = appointment.metadata?.google_calendar_id;
      const eventId = appointment.metadata?.google_event_id;

      if (!calendarId || !eventId) {
        throw new CalendarError({
          message: 'Google Calendar event information not found',
          code: CalendarErrorCode.APPOINTMENT_NOT_FOUND
        });
      }

      // Delete event from Google Calendar
      await this.calendar.events.delete({
        calendarId,
        eventId
      });
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to cancel appointment',
        code: CalendarErrorCode.INTERNAL_ERROR,
        details: { error }
      });
    }
  }

  async sync(): Promise<void> {
    if (!this.calendar) {
      throw new CalendarError({
        message: 'Google Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    // Sync is handled automatically by Google Calendar API
    // This method is a placeholder for any additional sync logic
  }

  private async getTherapistCalendarId(therapistId: string): Promise<string> {
    // TODO: Implement logic to get therapist's Google Calendar ID from your system
    // This could involve looking up the therapist's profile or settings
    return `therapist_${therapistId}@group.calendar.google.com`;
  }

  private async getAppointment(appointmentId: string): Promise<Appointment> {
    // TODO: Implement logic to get appointment details from your system
    throw new Error('Not implemented');
  }

  private calculateAvailableSlots(
    startDate: Date,
    endDate: Date,
    busySlots: calendar_v3.Schema$TimePeriod[]
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    let currentTime = DateTime.fromJSDate(startDate);
    const endTime = DateTime.fromJSDate(endDate);

    while (currentTime < endTime) {
      const slotEnd = currentTime.plus({ minutes: 50 }); // 50-minute sessions
      const isSlotAvailable = !busySlots.some(busy => {
        const busyStart = DateTime.fromISO(busy.start!);
        const busyEnd = DateTime.fromISO(busy.end!);
        return (
          (currentTime >= busyStart && currentTime < busyEnd) ||
          (slotEnd > busyStart && slotEnd <= busyEnd)
        );
      });

      if (isSlotAvailable) {
        availableSlots.push({
          startTime: currentTime.toJSDate(),
          endTime: slotEnd.toJSDate()
        });
      }

      currentTime = slotEnd.plus({ minutes: 10 }); // 10-minute break between sessions
    }

    return availableSlots;
  }
} 