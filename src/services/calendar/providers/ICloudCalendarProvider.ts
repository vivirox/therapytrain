import { DAVClient } from 'tsdav';
import { DateTime } from 'luxon';
import { CalendarProvider, ProviderConfig, CalendarError, CalendarErrorCode } from '../types';
import { Appointment } from '@/types/supabase';
import { TimeSlot } from '@/types/common';

export class ICloudCalendarProvider implements CalendarProvider {
  private davClient: DAVClient | null = null;

  async configure(config: ProviderConfig): Promise<void> {
    try {
      this.davClient = new DAVClient({
        serverUrl: 'https://caldav.icloud.com',
        credentials: {
          username: config.clientId, // Apple ID
          password: config.clientSecret // App-specific password
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav'
      });

      await this.davClient.login();
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to configure iCloud Calendar provider',
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
    if (!this.davClient) {
      throw new CalendarError({
        message: 'iCloud Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      // Get therapist's calendar URL
      const calendarUrl = await this.getTherapistCalendarUrl(therapistId);

      // Get events for the date range
      const events = await this.davClient.fetchCalendarObjects({
        calendar: { url: calendarUrl },
        timeRange: {
          start: startDate,
          end: endDate
        }
      });

      // Convert events to available slots
      return this.calculateAvailableSlots(startDate, endDate, events);
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
    if (!this.davClient) {
      throw new CalendarError({
        message: 'iCloud Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const calendarUrl = await this.getTherapistCalendarUrl(appointment.therapist_id);
      const eventId = crypto.randomUUID();

      // Create iCalendar event
      const icsEvent = this.createICalendarEvent(appointment, eventId);

      // Create event in iCloud Calendar
      await this.davClient.createCalendarObject({
        calendar: { url: calendarUrl },
        filename: `${eventId}.ics`,
        iCalString: icsEvent
      });

      // Return appointment with iCloud-specific metadata
      return {
        id: eventId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: appointment.client_id,
        therapist_id: appointment.therapist_id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        metadata: {
          ...appointment.metadata,
          icloud_event_id: eventId,
          icloud_calendar_url: calendarUrl
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
    if (!this.davClient) {
      throw new CalendarError({
        message: 'iCloud Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const calendarUrl = await this.getTherapistCalendarUrl(updates.therapist_id!);
      const eventId = updates.metadata?.icloud_event_id;

      if (!eventId) {
        throw new CalendarError({
          message: 'iCloud event ID not found',
          code: CalendarErrorCode.APPOINTMENT_NOT_FOUND
        });
      }

      // Get existing event
      const existingEvent = await this.davClient.fetchCalendarObject({
        calendar: { url: calendarUrl },
        filename: `${eventId}.ics`
      });

      // Update event data
      const updatedEvent = this.updateICalendarEvent(existingEvent.data, updates);

      // Update event in iCloud Calendar
      await this.davClient.updateCalendarObject({
        calendar: { url: calendarUrl },
        filename: `${eventId}.ics`,
        iCalString: updatedEvent
      });

      // Return updated appointment
      return {
        ...updates,
        id: appointmentId,
        updated_at: new Date().toISOString(),
        metadata: {
          ...updates.metadata,
          icloud_event_id: eventId,
          icloud_calendar_url: calendarUrl
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
    if (!this.davClient) {
      throw new CalendarError({
        message: 'iCloud Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const appointment = await this.getAppointment(appointmentId);
      const calendarUrl = appointment.metadata?.icloud_calendar_url;
      const eventId = appointment.metadata?.icloud_event_id;

      if (!calendarUrl || !eventId) {
        throw new CalendarError({
          message: 'iCloud event information not found',
          code: CalendarErrorCode.APPOINTMENT_NOT_FOUND
        });
      }

      // Delete event from iCloud Calendar
      await this.davClient.deleteCalendarObject({
        calendar: { url: calendarUrl },
        filename: `${eventId}.ics`
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
    if (!this.davClient) {
      throw new CalendarError({
        message: 'iCloud Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    // Sync is handled automatically by CalDAV
    // This method is a placeholder for any additional sync logic
  }

  private async getTherapistCalendarUrl(therapistId: string): Promise<string> {
    // TODO: Implement logic to get therapist's iCloud calendar URL from your system
    // This could involve looking up the therapist's profile or settings
    return `https://caldav.icloud.com/123456/calendars/${therapistId}`;
  }

  private async getAppointment(appointmentId: string): Promise<Appointment> {
    // TODO: Implement logic to get appointment details from your system
    throw new Error('Not implemented');
  }

  private calculateAvailableSlots(
    startDate: Date,
    endDate: Date,
    events: any[]
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    let currentTime = DateTime.fromJSDate(startDate);
    const endTime = DateTime.fromJSDate(endDate);

    while (currentTime < endTime) {
      const slotEnd = currentTime.plus({ minutes: 50 }); // 50-minute sessions
      const isSlotAvailable = !events.some(event => {
        const eventData = this.parseICalendarEvent(event.data);
        const eventStart = DateTime.fromISO(eventData.start);
        const eventEnd = DateTime.fromISO(eventData.end);
        return (
          (currentTime >= eventStart && currentTime < eventEnd) ||
          (slotEnd > eventStart && slotEnd <= eventEnd)
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

  private createICalendarEvent(
    appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>,
    eventId: string
  ): string {
    const now = new Date().toISOString().replace(/[-:.]/g, '');
    const start = new Date(appointment.start_time).toISOString().replace(/[-:.]/g, '');
    const end = new Date(appointment.end_time).toISOString().replace(/[-:.]/g, '');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gradiant//Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${eventId}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Therapy Session with ${appointment.metadata?.client_name || 'Client'}`,
      appointment.metadata?.notes ? `DESCRIPTION:${appointment.metadata.notes}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }

  private updateICalendarEvent(
    existingEvent: string,
    updates: Partial<Appointment>
  ): string {
    // Parse existing event
    const lines = existingEvent.split('\r\n');
    const updatedLines = lines.map(line => {
      if (updates.start_time && line.startsWith('DTSTART:')) {
        return `DTSTART:${new Date(updates.start_time).toISOString().replace(/[-:.]/g, '')}`;
      }
      if (updates.end_time && line.startsWith('DTEND:')) {
        return `DTEND:${new Date(updates.end_time).toISOString().replace(/[-:.]/g, '')}`;
      }
      if (updates.metadata?.notes && line.startsWith('DESCRIPTION:')) {
        return `DESCRIPTION:${updates.metadata.notes}`;
      }
      return line;
    });

    return updatedLines.join('\r\n');
  }

  private parseICalendarEvent(iCalString: string): { start: string; end: string } {
    const lines = iCalString.split('\r\n');
    let start = '';
    let end = '';

    for (const line of lines) {
      if (line.startsWith('DTSTART:')) {
        start = this.formatICalDate(line.substring(8));
      } else if (line.startsWith('DTEND:')) {
        end = this.formatICalDate(line.substring(6));
      }
    }

    return { start, end };
  }

  private formatICalDate(iCalDate: string): string {
    // Convert from iCal date format to ISO string
    const year = iCalDate.substring(0, 4);
    const month = iCalDate.substring(4, 6);
    const day = iCalDate.substring(6, 8);
    const hour = iCalDate.substring(9, 11);
    const minute = iCalDate.substring(11, 13);
    const second = iCalDate.substring(13, 15);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }
} 