import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '../monitoring/cache/route';
import { getCacheAnalytics } from '@/lib/redis';
import { CacheMonitoringService } from '@/lib/services/CacheMonitoringService';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  getCacheAnalytics: vi.fn(),
}));

vi.mock('@/lib/services/CacheMonitoringService', () => ({
  CacheMonitoringService: {
    getInstance: vi.fn(() => ({
      clearAlerts: vi.fn(),
    })),
  },
}));

describe('Monitoring API', () => {
  let mockSupabase: any;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock session
    mockSession = {
      user: {
        id: 'test-user-id',
      },
    };

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      }),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('GET handler', () => {
    it('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const req = new NextRequest('http://localhost/api/monitoring/cache');
      const response = await GET(req);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'user' },
        error: null,
      });

      const req = new NextRequest('http://localhost/api/monitoring/cache');
      const response = await GET(req);

      expect(response.status).toBe(403);
      expect(await response.text()).toBe('Forbidden');
    });

    it('should return cache analytics for admin user', async () => {
      const mockAnalytics = {
        hitRate: 0.85,
        missRate: 0.15,
        evictionRate: 0.05,
        memoryUsage: 0.75,
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      (getCacheAnalytics as any).mockResolvedValueOnce(mockAnalytics);

      const req = new NextRequest('http://localhost/api/monitoring/cache');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAnalytics);
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      (getCacheAnalytics as any).mockRejectedValueOnce(new Error('Redis error'));

      const req = new NextRequest('http://localhost/api/monitoring/cache');
      const response = await GET(req);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Internal Server Error');
    });
  });

  describe('POST handler', () => {
    it('should return 401 if not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const req = new NextRequest('http://localhost/api/monitoring/cache', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearAlerts' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'user' },
        error: null,
      });

      const req = new NextRequest('http://localhost/api/monitoring/cache', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearAlerts' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(403);
      expect(await response.text()).toBe('Forbidden');
    });

    it('should clear alerts for admin user', async () => {
      const mockCacheMonitor = CacheMonitoringService.getInstance();

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      const req = new NextRequest('http://localhost/api/monitoring/cache', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearAlerts' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Alerts cleared');
      expect(mockCacheMonitor.clearAlerts).toHaveBeenCalled();
    });

    it('should return 400 for invalid action', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      const req = new NextRequest('http://localhost/api/monitoring/cache', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalidAction' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid action');
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      });

      const mockCacheMonitor = CacheMonitoringService.getInstance();
      (mockCacheMonitor.clearAlerts as any).mockRejectedValueOnce(new Error('Cache error'));

      const req = new NextRequest('http://localhost/api/monitoring/cache', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearAlerts' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Internal Server Error');
    });
  });
}); 