import { Client } from '@microsoft/microsoft-graph-client';
import { DateTime } from 'luxon';
import { CalendarProvider, ProviderConfig, CalendarError, CalendarErrorCode } from '../types';
import { Appointment } from '@/types/supabase';
import { TimeSlot } from '@/types/common';

export class OutlookCalendarProvider implements CalendarProvider {
  private graphClient: Client | null = null;

  async configure(config: ProviderConfig): Promise<void> {
    try {
      this.graphClient = Client.init({
        authProvider: async (done) => {
          // Use the provided credentials to get an access token
          // This is a simplified example - you should implement proper token management
          if (config.additionalConfig?.accessToken) {
            done(null, config.additionalConfig.accessToken as string);
          } else {
            done(new Error('No access token provided'), null);
          }
        }
      });
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to configure Outlook Calendar provider',
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
    if (!this.graphClient) {
      throw new CalendarError({
        message: 'Outlook Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      // Get therapist's Outlook user ID
      const userId = await this.getTherapistUserId(therapistId);

      // Get calendar view for the date range
      const events = await this.graphClient
        .api(`/users/${userId}/calendar/calendarView`)
        .query({
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString()
        })
        .get();

      // Convert busy times to available slots
      return this.calculateAvailableSlots(startDate, endDate, events.value);
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
    if (!this.graphClient) {
      throw new CalendarError({
        message: 'Outlook Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const userId = await this.getTherapistUserId(appointment.therapist_id);

      // Create event in Outlook Calendar
      const event = await this.graphClient
        .api(`/users/${userId}/calendar/events`)
        .post({
          subject: `Therapy Session with ${appointment.metadata?.client_name || 'Client'}`,
          body: {
            contentType: 'text',
            content: appointment.metadata?.notes
          },
          start: {
            dateTime: appointment.start_time,
            timeZone: appointment.metadata?.timezone || 'UTC'
          },
          end: {
            dateTime: appointment.end_time,
            timeZone: appointment.metadata?.timezone || 'UTC'
          },
          attendees: [
            {
              emailAddress: {
                address: appointment.metadata?.client_email
              },
              type: 'required'
            },
            {
              emailAddress: {
                address: appointment.metadata?.therapist_email
              },
              type: 'required'
            }
          ],
          reminderMinutesBeforeStart: 30
        });

      // Convert Outlook event to Appointment
      return {
        id: event.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: appointment.client_id,
        therapist_id: appointment.therapist_id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        metadata: {
          ...appointment.metadata,
          outlook_event_id: event.id,
          outlook_user_id: userId
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
    if (!this.graphClient) {
      throw new CalendarError({
        message: 'Outlook Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const userId = await this.getTherapistUserId(updates.therapist_id!);
      const eventId = updates.metadata?.outlook_event_id;

      if (!eventId) {
        throw new CalendarError({
          message: 'Outlook event ID not found',
          code: CalendarErrorCode.APPOINTMENT_NOT_FOUND
        });
      }

      // Update event in Outlook Calendar
      const event = await this.graphClient
        .api(`/users/${userId}/calendar/events/${eventId}`)
        .patch({
          start: updates.start_time ? {
            dateTime: updates.start_time,
            timeZone: updates.metadata?.timezone || 'UTC'
          } : undefined,
          end: updates.end_time ? {
            dateTime: updates.end_time,
            timeZone: updates.metadata?.timezone || 'UTC'
          } : undefined,
          body: updates.metadata?.notes ? {
            contentType: 'text',
            content: updates.metadata.notes
          } : undefined
        });

      // Return updated appointment
      return {
        ...updates,
        id: appointmentId,
        updated_at: new Date().toISOString(),
        metadata: {
          ...updates.metadata,
          outlook_event_id: event.id,
          outlook_user_id: userId
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
    if (!this.graphClient) {
      throw new CalendarError({
        message: 'Outlook Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    try {
      const appointment = await this.getAppointment(appointmentId);
      const userId = appointment.metadata?.outlook_user_id;
      const eventId = appointment.metadata?.outlook_event_id;

      if (!userId || !eventId) {
        throw new CalendarError({
          message: 'Outlook event information not found',
          code: CalendarErrorCode.APPOINTMENT_NOT_FOUND
        });
      }

      // Delete event from Outlook Calendar
      await this.graphClient
        .api(`/users/${userId}/calendar/events/${eventId}`)
        .delete();
    } catch (error) {
      throw new CalendarError({
        message: 'Failed to cancel appointment',
        code: CalendarErrorCode.INTERNAL_ERROR,
        details: { error }
      });
    }
  }

  async sync(): Promise<void> {
    if (!this.graphClient) {
      throw new CalendarError({
        message: 'Outlook Calendar provider not configured',
        code: CalendarErrorCode.CONFIGURATION_ERROR
      });
    }

    // Sync is handled automatically by Microsoft Graph API
    // This method is a placeholder for any additional sync logic
  }

  private async getTherapistUserId(therapistId: string): Promise<string> {
    // TODO: Implement logic to get therapist's Outlook user ID from your system
    // This could involve looking up the therapist's profile or settings
    return `therapist_${therapistId}@outlook.com`;
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
        const eventStart = DateTime.fromISO(event.start.dateTime);
        const eventEnd = DateTime.fromISO(event.end.dateTime);
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
} 