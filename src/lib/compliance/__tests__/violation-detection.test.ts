import { ViolationDetectionSystem } from '../violation-detection';
import { supabase } from '@/lib/supabaseClient';
import { AlertService } from '../../email/alert-service';

// Mock supabase and AlertService
jest.mock('@/lib/supabaseclient', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      eq: jest.fn().mockResolvedValue({})
    }))
  }
}));

jest.mock('../../email/alert-service', () => ({
  AlertService: {
    createAlert: jest.fn().mockResolvedValue({})
  }
}));

describe('ViolationDetectionSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvent', () => {
    it('should detect unauthorized access violation', async () => {
      const event = {
        type: 'access',
        authorized: false,
        user_id: 'test-user',
        timestamp: new Date().toISOString()
      };

      const violations = await ViolationDetectionSystem.processEvent(event);

      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('unauthorized_access');
      expect(violations[0].severity).toBe('high');
      expect(supabase.from).toHaveBeenCalledWith('hipaa_violations');
      expect(AlertService.createAlert).toHaveBeenCalled();
    });

    it('should detect PHI exposure violation', async () => {
      const event = {
        type: 'data_access',
        data_type: 'phi',
        encrypted: false,
        user_id: 'test-user',
        timestamp: new Date().toISOString()
      };

      const violations = await ViolationDetectionSystem.processEvent(event);

      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('phi_exposure');
      expect(violations[0].severity).toBe('critical');
      expect(supabase.from).toHaveBeenCalledWith('hipaa_violations');
      expect(AlertService.createAlert).toHaveBeenCalled();
    });

    it('should detect encryption failure violation', async () => {
      const event = {
        type: 'encryption',
        status: 'failed',
        data_id: 'test-data',
        timestamp: new Date().toISOString()
      };

      const violations = await ViolationDetectionSystem.processEvent(event);

      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('encryption_failure');
      expect(violations[0].severity).toBe('critical');
      expect(supabase.from).toHaveBeenCalledWith('hipaa_violations');
      expect(AlertService.createAlert).toHaveBeenCalled();
    });

    it('should not detect violation for valid events', async () => {
      const event = {
        type: 'access',
        authorized: true,
        user_id: 'test-user',
        timestamp: new Date().toISOString()
      };

      const violations = await ViolationDetectionSystem.processEvent(event);

      expect(violations).toHaveLength(0);
      expect(supabase.from).not.toHaveBeenCalled();
      expect(AlertService.createAlert).not.toHaveBeenCalled();
    });
  });

  describe('handleCriticalViolation', () => {
    it('should lock user account for unauthorized access', async () => {
      const event = {
        type: 'access',
        authorized: false,
        user_id: 'test-user',
        timestamp: new Date().toISOString()
      };

      await ViolationDetectionSystem.processEvent(event);

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from('users').update).toHaveBeenCalledWith(
        expect.objectContaining({
          locked: true,
          lock_reason: expect.stringContaining('HIPAA violation')
        })
      );
    });

    it('should initiate breach protocol for PHI exposure', async () => {
      const event = {
        type: 'data_access',
        data_type: 'phi',
        encrypted: false,
        data_id: 'test-data',
        timestamp: new Date().toISOString()
      };

      await ViolationDetectionSystem.processEvent(event);

      expect(supabase.from).toHaveBeenCalledWith('breach_incidents');
      expect(supabase.from('breach_incidents').insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'initiated',
            severity: 'critical'
          })
        ])
      );
    });

    it('should secure affected data for encryption failure', async () => {
      const event = {
        type: 'encryption',
        status: 'failed',
        data_id: 'test-data',
        data_type: 'patient_record',
        timestamp: new Date().toISOString()
      };

      await ViolationDetectionSystem.processEvent(event);

      expect(supabase.from).toHaveBeenCalledWith('data_security_incidents');
      expect(supabase.from('data_security_incidents').insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'securing',
            data_id: 'test-data',
            data_type: 'patient_record'
          })
        ])
      );
    });
  });
}); 