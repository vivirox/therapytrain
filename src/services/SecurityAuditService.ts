import { ZKOperation } from './zkService';
import * as Sentry from '@sentry/nextjs';

export class SecurityAuditService {
  recordAuthAttempt(recordAuthAttempt: any) {
    throw new Error("Method not implemented.");
  }
  recordAlert(recordAlert: any) {
    throw new Error("Method not implemented.");
  }
  private static instance: SecurityAuditService;
  private auditLog: ZKOperation[];

  private constructor() {
    this.auditLog = [];
  }

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  /**
   * Log a new operation in the audit trail
   */
  public async logOperation(operation: ZKOperation): Promise<void> {
    try {
      // Add timestamp if not present
      if (!operation.timestamp) {
        operation.timestamp = new Date();
      }

      // Store operation in audit log
      this.auditLog.push(operation);

      // Log to Sentry for external monitoring
      Sentry.addBreadcrumb({
        category: 'audit',
        message: `Operation ${operation.type} completed`,
        level: 'info',
        data: {
          operationId: operation.id,
          type: operation.type,
          userId: operation.userId,
          sessionId: operation.sessionId,
          status: operation.status
        }
      });

    } catch (error) {
      console.error('Error logging operation:', error);
      Sentry.captureException(error, {
        tags: {
          operation_type: operation.type,
          operation_id: operation.id
        }
      });
      throw error;
    }
  }

  /**
   * Get all operations for a specific user
   */
  public getUserOperations(userId: string): ZKOperation[] {
    return this.auditLog.filter(op => op.userId === userId);
  }

  /**
   * Get all operations for a specific session
   */
  public getSessionOperations(sessionId: string): ZKOperation[] {
    return this.auditLog.filter(op => op.sessionId === sessionId);
  }

  /**
   * Get operations by type
   */
  public getOperationsByType(type: string): ZKOperation[] {
    return this.auditLog.filter(op => op.type === type);
  }

  /**
   * Get operations within a time range
   */
  public getOperationsInTimeRange(startTime: Date, endTime: Date): ZKOperation[] {
    return this.auditLog.filter(op => {
      const opTime = op.timestamp instanceof Date 
        ? op.timestamp 
        : new Date(op.timestamp);
      return opTime >= startTime && opTime <= endTime;
    });
  }

  /**
   * Get failed operations
   */
  public getFailedOperations(): ZKOperation[] {
    return this.auditLog.filter(op => op.status === 'FAILURE');
  }

  /**
   * Clear audit log (for testing purposes only)
   */
  public clearAuditLog(): void {
    this.auditLog = [];
  }
} 