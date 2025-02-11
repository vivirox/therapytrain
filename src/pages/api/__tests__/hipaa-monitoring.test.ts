import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import hipaaMonitoringHandler from '../hipaa-monitoring';
import { HipaaMonitoringService } from '@/lib/compliance/hipaa-monitoring';

jest.mock('@/lib/compliance/hipaa-monitoring', () => ({
  HipaaMonitoringService: {
    startMonitoring: jest.fn(),
    handlePhiAccessChange: jest.fn().mockResolvedValue({ status: 'processed' }),
    handleAuthenticationChange: jest.fn().mockResolvedValue({ status: 'processed' }),
    handleEncryptionChange: jest.fn().mockResolvedValue({ status: 'processed' }),
  },
}));

describe('HIPAA Monitoring API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP Method Validation', () => {
    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        env: process.env,
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
        message: 'Only POST requests are accepted',
        allowedMethods: ['POST'],
      });
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          type: 'phi_access',
          user_id: 'test-user',
          record_id: 'test-record',
          authorized: false,
        },
      });

      await hipaaMonitoringHandler(req, res);

      expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
      expect(res.getHeader('X-Frame-Options')).toBe('DENY');
      expect(res.getHeader('X-XSS-Protection')).toBe('1; mode=block');
      expect(res.getHeader('X-RateLimit-Limit')).toBe('100');
      expect(res.getHeader('X-RateLimit-Remaining')).toBe('99');
    });
  });

  describe('Event Validation', () => {
    it('should return detailed error for missing event data', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response.error).toBe('Missing event data');
      expect(response.example).toBeDefined();
    });

    it('should validate required fields for PHI access events', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          type: 'phi_access',
          user_id: 'test-user',
          // missing record_id and authorized
        },
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response.error).toBe('Validation error');
      expect(response.message).toContain('Missing required fields');
    });

    it('should validate required fields for authentication events', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          type: 'authentication',
          // missing user_id and status
        },
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response.message).toContain('user_id, status');
    });

    it('should validate required fields for encryption events', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          type: 'encryption',
          record_id: 'test-record',
          // missing status and failure_type
        },
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const response = JSON.parse(res._getData());
      expect(response.message).toContain('status, failure_type');
    });
  });

  describe('Event Processing', () => {
    it('should handle PHI access events with metadata', async () => {
      const mockEvent = {
        type: 'phi_access',
        user_id: 'test-user',
        record_id: 'test-record',
        authorized: false,
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: mockEvent,
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '127.0.0.1',
          'x-request-id': 'test-request-id',
        },
      });

      await hipaaMonitoringHandler(req, res);

      expect(HipaaMonitoringService.handlePhiAccessChange).toHaveBeenCalledWith(
        expect.objectContaining({
          new: expect.objectContaining({
            ...mockEvent,
            metadata: expect.objectContaining({
              timestamp: expect.any(String),
              client_ip: '127.0.0.1',
              user_agent: 'test-agent',
              request_id: 'test-request-id',
            }),
          }),
        })
      );

      expect(res._getStatusCode()).toBe(200);
      const response = JSON.parse(res._getData());
      expect(response).toEqual({
        success: true,
        timestamp: expect.any(String),
        request_id: 'test-request-id',
        result: { status: 'processed' },
      });
    });

    it('should generate request_id if not provided', async () => {
      const mockEvent = {
        type: 'authentication',
        user_id: 'test-user',
        status: 'failed',
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: mockEvent,
      });

      await hipaaMonitoringHandler(req, res);

      const response = JSON.parse(res._getData());
      expect(response.request_id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors with detailed response', async () => {
      const mockEvent = {
        type: 'phi_access',
        user_id: 'test-user',
        record_id: 'test-record',
        authorized: false,
      };

      const mockError = new Error('Database connection failed');
      (HipaaMonitoringService.handlePhiAccessChange as jest.Mock).mockRejectedValueOnce(mockError);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: mockEvent,
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const response = JSON.parse(res._getData());
      expect(response).toEqual({
        error: 'Internal server error',
        message: 'Database connection failed',
        request_id: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should handle unknown errors gracefully', async () => {
      const mockEvent = {
        type: 'phi_access',
        user_id: 'test-user',
        record_id: 'test-record',
        authorized: false,
      };

      (HipaaMonitoringService.handlePhiAccessChange as jest.Mock).mockRejectedValueOnce('Unknown error');

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: mockEvent,
      });

      await hipaaMonitoringHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const response = JSON.parse(res._getData());
      expect(response.message).toBe('Unknown error occurred');
    });
  });
}); 