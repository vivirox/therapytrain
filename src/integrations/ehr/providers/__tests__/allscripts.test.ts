import { AllscriptsProvider } from '../allscripts';
import { EHRConfig } from '../../types';
import { FHIRClient } from '../../fhir-client';

jest.mock('../../fhir-client');

describe('Allscripts Provider', () => {
  let provider: AllscriptsProvider;
  let mockConfig: EHRConfig;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      vendor: 'allscripts',
      baseUrl: 'https://fhirapi.allscripts.com/v1/fhir/r4',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['system/Patient.read', 'system/Practitioner.read'],
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
            software: {
              name: 'Allscripts FHIR Server',
              version: '1.0',
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    provider = new AllscriptsProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully with valid configuration', async () => {
      await expect(provider.connect()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://fhirapi.allscripts.com/v1/auth/oauth2/token',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.baseUrl}/metadata`,
        expect.any(Object)
      );
    });

    it('should throw error when base URL is missing', async () => {
      const invalidConfig = { ...mockConfig, baseUrl: '' };
      const invalidProvider = new AllscriptsProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Allscripts base URL is required');
    });

    it('should throw error when base URL format is invalid', async () => {
      const invalidConfig = { ...mockConfig, baseUrl: 'https://invalid-url.com' };
      const invalidProvider = new AllscriptsProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Invalid Allscripts FHIR URL format');
    });

    it('should throw error when client ID is missing', async () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      const invalidProvider = new AllscriptsProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Allscripts client ID is required');
    });

    it('should throw error when client secret is missing', async () => {
      const invalidConfig = { ...mockConfig, clientSecret: '' };
      const invalidProvider = new AllscriptsProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Allscripts client secret is required');
    });

    it('should throw error when scopes are missing', async () => {
      const invalidConfig = { ...mockConfig, scopes: [] };
      const invalidProvider = new AllscriptsProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Allscripts OAuth scopes are required');
    });

    it('should throw error when authentication fails', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
      );
      await expect(provider.connect()).rejects.toThrow('Allscripts authentication failed: 401 Unauthorized');
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

    it('should throw error when server is not Allscripts', async () => {
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
              resourceType: 'CapabilityStatement',
              software: {
                name: 'Other FHIR Server',
              },
            }),
          })
        );
      await expect(provider.connect()).rejects.toThrow('Invalid Allscripts FHIR server response');
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
        'https://fhirapi.allscripts.com/v1/auth/oauth2/token',
        expect.any(Object)
      );
    });
  });

  describe('FHIR client', () => {
    it('should throw error when getting client before connection', () => {
      expect(() => provider.getClient()).toThrow('Allscripts provider not connected');
    });

    it('should return FHIR client after successful connection', async () => {
      await provider.connect();
      const client = provider.getClient();
      expect(client).toBeInstanceOf(FHIRClient);
    });
  });
}); 