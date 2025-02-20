import { EpicProvider } from '../epic';
import { EHRConfig } from '../../types';
import { FHIRClient } from '../../fhir-client';

jest.mock('../../fhir-client');

describe('Epic Provider', () => {
  let provider: EpicProvider;
  let mockConfig: EHRConfig;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      vendor: 'epic',
      baseUrl: 'https://epic-fhir.example.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['patient/*.read', 'user/*.read'],
      fhirVersion: '4.0.1',
    };

    // Mock fetch globally
    mockFetch = jest.spyOn(global, 'fetch');
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/oauth2/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock-access-token',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: mockConfig.scopes.join(' '),
          }),
        });
      }
      if (url.endsWith('/metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            resourceType: 'CapabilityStatement',
            status: 'active',
            fhirVersion: '4.0.1',
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    provider = new EpicProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully with valid configuration', async () => {
      await expect(provider.connect()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://epic-fhir.example.com/oauth2/token',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://epic-fhir.example.com/metadata',
        expect.any(Object)
      );
    });

    it('should throw error when base URL is missing', async () => {
      const invalidConfig = { ...mockConfig, baseUrl: '' };
      const invalidProvider = new EpicProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Epic base URL is required');
    });

    it('should throw error when client ID is missing', async () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      const invalidProvider = new EpicProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Epic client ID is required');
    });

    it('should throw error when client secret is missing', async () => {
      const invalidConfig = { ...mockConfig, clientSecret: '' };
      const invalidProvider = new EpicProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Epic client secret is required');
    });

    it('should throw error when scopes are missing', async () => {
      const invalidConfig = { ...mockConfig, scopes: [] };
      const invalidProvider = new EpicProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Epic SMART scopes are required');
    });

    it('should throw error when authentication fails', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
      );
      await expect(provider.connect()).rejects.toThrow('SMART authentication failed: 401 Unauthorized');
    });

    it('should throw error when capability statement is invalid', async () => {
      mockFetch
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              access_token: 'mock-access-token',
              token_type: 'Bearer',
              expires_in: 3600,
              scope: mockConfig.scopes.join(' '),
            }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              resourceType: 'Invalid',
            }),
          })
        );
      await expect(provider.connect()).rejects.toThrow('Invalid capability statement received');
    });
  });

  describe('token management', () => {
    beforeEach(async () => {
      await provider.connect();
    });

    it('should check token validity', async () => {
      expect(await provider.isTokenValid()).toBe(true);
      
      // Mock token expiration
      jest.advanceTimersByTime(3600 * 1000);
      expect(await provider.isTokenValid()).toBe(false);
    });

    it('should refresh token successfully', async () => {
      const newToken = 'new-access-token';
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: newToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: mockConfig.scopes.join(' '),
          }),
        })
      );

      await provider.refreshToken();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://epic-fhir.example.com/oauth2/token',
        expect.any(Object)
      );
    });
  });

  describe('FHIR client', () => {
    it('should throw error when getting client before connection', () => {
      expect(() => provider.getClient()).toThrow('Epic provider not connected');
    });

    it('should return FHIR client after successful connection', async () => {
      await provider.connect();
      const client = provider.getClient();
      expect(client).toBeInstanceOf(FHIRClient);
    });
  });
}); 