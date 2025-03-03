import { EventEmitter } from "events";
import { singleton } from "tsyringe";

export interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  severity: "info" | "warning" | "error";
}

// Apply singleton as a function instead of decorator
@singleton()
export class AuditService extends EventEmitter {
  private static instance: AuditService;
  private events: Array<{
    event: AuditEvent;
    processed: boolean;
  }> = [];

  constructor() {
    super();
    this.on("audit", this.handleAuditEvent);
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public logEvent(event: AuditEvent): void {
    this.emit("audit", event);
  }

  private handleAuditEvent(event: AuditEvent): void {
    this.events.push({
      event,
      processed: false,
    });

    // In a real implementation, we would persist this to a database
    console.log(
      `Audit event: ${event.action} on ${event.resource} by ${event.userId}`,
    );

    // For critical events, we might want to trigger immediate notifications
    if (event.severity === "error") {
      this.triggerAlerts(event);
    }
  }

  private triggerAlerts(event: AuditEvent): void {
    // In a real implementation, this would send emails, SMS, or other alerts
    console.log(
      `ALERT: Critical audit event: ${event.action} on ${event.resource} by ${event.userId}`,
    );
  }

  public getEvents(filter?: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: "info" | "warning" | "error";
    startDate?: Date;
    endDate?: Date;
  }): AuditEvent[] {
    let filteredEvents = this.events.map((e) => e.event);

    if (filter) {
      if (filter.userId) {
        filteredEvents = filteredEvents.filter(
          (e) => e.userId === filter.userId,
        );
      }
      if (filter.action) {
        filteredEvents = filteredEvents.filter(
          (e) => e.action === filter.action,
        );
      }
      if (filter.resource) {
        filteredEvents = filteredEvents.filter(
          (e) => e.resource === filter.resource,
        );
      }
      if (filter.severity) {
        filteredEvents = filteredEvents.filter(
          (e) => e.severity === filter.severity,
        );
      }
      if (filter.startDate) {
        filteredEvents = filteredEvents.filter(
          (e) => filter.startDate ? e.timestamp >= filter.startDate : true,
        );
      }
      if (filter.endDate) {
        filteredEvents = filteredEvents.filter(
          (e) => filter.endDate ? e.timestamp <= filter.endDate : true,
        );
      }
    }

    return filteredEvents;
  }
}
