import { supabase } from '@/lib/supabaseClient';
import { HipaaMonitoringService } from '../hipaa-monitoring';
import { AlertService } from '@/lib/email/alert-service';

// Mock Supabase client
jest.mock('@/lib/supabaseclient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      single: jest.fn(),
      in: jest.fn().mockReturnThis(),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
  },
}));

// Mock AlertService
jest.mock('@/lib/email/alert-service', () => ({
  AlertService: {
    createAlert: jest.fn(),
  },
}));

describe('HipaaMonitoringService', () => {
  const mockUserId = 'test-user-id';
  const mockRecordId = 'test-record-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Real-time Monitoring', () => {
    it('should initialize monitoring subscription', async () => {
      const subscription = await HipaaMonitoringService.startMonitoring();
      
      expect(supabase.channel).toHaveBeenCalledWith('hipaa-monitoring');
      expect(subscription.subscribe).toHaveBeenCalled();
    });

    it('should handle PHI access changes', async () => {
      const mockPayload = {
        new: {
          user_id: mockUserId,
          authorized: false,
        },
        old: null,
        eventType: 'INSERT',
      };

      // Mock unauthorized access detection
      (supabase.from('phi_access_logs').select().count as jest.Mock)
        .mockResolvedValueOnce({ count: 5 });

      await HipaaMonitoringService['handlePhiAccessChange'](mockPayload);

      expect(AlertService.createAlert).toHaveBeenCalledWith(
        'hipaa_violation',
        'high',
        expect.stringContaining('unauthorized access attempts detected'),
        expect.any(Object)
      );
    });

    it('should handle authentication failures', async () => {
      const mockPayload = {
        new: {
          user_id: mockUserId,
          status: 'failed',
        },
      };

      // Mock authentication failure detection
      (supabase.from('authentication_logs').select().count as jest.Mock)
        .mockResolvedValueOnce({ count: 7 });

      await HipaaMonitoringService['handleAuthenticationChange'](mockPayload);

      expect(AlertService.createAlert).toHaveBeenCalledWith(
        'hipaa_violation',
        'high',
        expect.stringContaining('authentication failures detected'),
        expect.any(Object)
      );
    });

    it('should handle encryption failures', async () => {
      const mockPayload = {
        new: {
          record_id: mockRecordId,
          status: 'failed',
          failure_type: 'encryption_process',
        },
      };

      await HipaaMonitoringService['handleEncryptionChange'](mockPayload);

      expect(AlertService.createAlert).toHaveBeenCalledWith(
        'hipaa_violation',
        'critical',
        expect.stringContaining('Data encryption process failure'),
        expect.any(Object)
      );
    });
  });

  describe('Violation Detection', () => {
    it('should detect unauthorized access attempts', async () => {
      // Mock critical number of unauthorized attempts
      (supabase.from('phi_access_logs').select().count as jest.Mock)
        .mockResolvedValueOnce({ count: 10 });

      const violations = await HipaaMonitoringService['detectUnauthorizedAccess'](mockUserId);

      expect(violations).toHaveLength(1);
      expect(violations[0]).toEqual({
        type: 'unauthorized_access',
        severity: 'critical',
        description: expect.stringContaining('10 unauthorized access attempts'),
        metadata: expect.any(Object),
        remediation_steps: expect.any(Array),
      });
    });

    it('should detect PHI exposure', async () => {
      const mockRecord = {
        id: mockRecordId,
        exposure_level: 'high',
        exposure_type: 'unencrypted_transmission',
      };

      const violations = await HipaaMonitoringService['detectPhiExposure'](mockRecord);

      expect(violations).toHaveLength(1);
      expect(violations[0]).toEqual({
        type: 'phi_exposure',
        severity: 'critical',
        description: expect.stringContaining('High-risk PHI exposure'),
        metadata: expect.any(Object),
        remediation_steps: expect.any(Array),
      });
    });

    it('should detect authentication failures', async () => {
      // Mock high number of authentication failures
      (supabase.from('authentication_logs').select().count as jest.Mock)
        .mockResolvedValueOnce({ count: 15 });

      const violations = await HipaaMonitoringService['detectAuthenticationFailures'](mockUserId);

      expect(violations).toHaveLength(1);
      expect(violations[0]).toEqual({
        type: 'authentication_failure',
        severity: 'critical',
        description: expect.stringContaining('15 authentication failures'),
        metadata: expect.any(Object),
        remediation_steps: expect.any(Array),
      });
    });
  });

  describe('Incident Handling', () => {
    it('should handle critical violations', async () => {
      const mockViolation = {
        type: 'unauthorized_access' as const,
        severity: 'critical' as const,
        description: 'Critical violation',
        metadata: { user_id: mockUserId },
        remediation_steps: ['Lock account'],
      };

      await HipaaMonitoringService['handleCriticalViolation'](mockViolation);

      expect(supabase.from('users').update).toHaveBeenCalledWith(
        expect.objectContaining({
          locked: true,
          locked_at: expect.any(String),
        })
      );
    });

    it('should initiate breach protocol', async () => {
      const mockViolation = {
        type: 'phi_exposure' as const,
        severity: 'critical' as const,
        description: 'PHI exposure',
        metadata: { record_id: mockRecordId },
        remediation_steps: ['Revoke access'],
      };

      await HipaaMonitoringService['initiateBreachProtocol'](mockViolation);

      expect(supabase.from('breach_incidents').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          violation_id: mockRecordId,
          status: 'initiated',
          severity: 'critical',
        }),
      ]);
    });

    it('should log violations', async () => {
      const mockViolation = {
        type: 'encryption_failure' as const,
        severity: 'high' as const,
        description: 'Encryption failure',
        metadata: { record_id: mockRecordId },
        remediation_steps: ['Review system'],
      };

      await HipaaMonitoringService['logViolation'](mockViolation);

      expect(supabase.from('hipaa_violation_logs').insert).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'encryption_failure',
          severity: 'high',
          description: 'Encryption failure',
        }),
      ]);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete violation lifecycle', async () => {
      // Mock critical unauthorized access
      (supabase.from('phi_access_logs').select().count as jest.Mock)
        .mockResolvedValueOnce({ count: 10 });

      // Simulate unauthorized access event
      await HipaaMonitoringService['handlePhiAccessChange']({
        new: {
          user_id: mockUserId,
          authorized: false,
        },
        old: null,
        eventType: 'INSERT',
      });

      // Verify alert creation
      expect(AlertService.createAlert).toHaveBeenCalled();

      // Verify violation logging
      expect(supabase.from('hipaa_violation_logs').insert).toHaveBeenCalled();

      // Verify account locking
      expect(supabase.from('users').update).toHaveBeenCalledWith(
        expect.objectContaining({ locked: true })
      );
    });

    it('should handle multiple concurrent violations', async () => {
      // Mock violations
      const violations = [
        {
          type: 'unauthorized_access' as const,
          severity: 'critical' as const,
          description: 'Unauthorized access',
          metadata: { user_id: mockUserId },
        },
        {
          type: 'phi_exposure' as const,
          severity: 'high' as const,
          description: 'PHI exposure',
          metadata: { record_id: mockRecordId },
        },
      ];

      await HipaaMonitoringService['handleViolations'](violations);

      // Verify multiple alerts created
      expect(AlertService.createAlert).toHaveBeenCalledTimes(2);

      // Verify violations logged
      expect(supabase.from('hipaa_violation_logs').insert).toHaveBeenCalledTimes(2);
    });
  });
}); 