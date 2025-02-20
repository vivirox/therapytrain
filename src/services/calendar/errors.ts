export class CalendarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarError';
  }
}

export class CalendarProviderNotFoundError extends CalendarError {
  constructor(providerId: string) {
    super(`Calendar provider not found: ${providerId}`);
    this.name = 'CalendarProviderNotFoundError';
  }
}

export class CalendarConflictError extends CalendarError {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarConflictError';
  }
}

export class CalendarSyncError extends CalendarError {
  constructor(providerId: string, error: Error) {
    super(`Failed to sync with provider ${providerId}: ${error.message}`);
    this.name = 'CalendarSyncError';
  }
}

export class CalendarPropagationError extends CalendarError {
  constructor(providerId: string, action: string, error: Error) {
    super(`Failed to propagate ${action} to provider ${providerId}: ${error.message}`);
    this.name = 'CalendarPropagationError';
  }
}

export class AppointmentNotFoundError extends CalendarError {
  constructor(appointmentId: string) {
    super(`Appointment not found: ${appointmentId}`);
    this.name = 'AppointmentNotFoundError';
  }
}

export class InvalidTimeSlotError extends CalendarError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTimeSlotError';
  }
} 