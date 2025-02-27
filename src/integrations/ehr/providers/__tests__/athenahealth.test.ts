import { AthenahealthProvider } from '../athenahealth';
import { EHRConfig } from '../../types';
import { FHIRClient } from '../../fhir-client';

jest.mock('../../fhir-client');

describe('Athenahealth Provider', () => {
  let provider: AthenahealthProvider;
  let mockConfig: EHRConfig;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockConfig = {
      vendor: 'athenahealth',
      baseUrl: 'https://api.athenahealth.com/fhir/r4',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['system/Patient.read', 'system/Practitioner.read'],
      fhirVersion: '4.0.1',
    };

    // Mock fetch globally
    mockFetch = jest.spyOn(global, 'fetch');
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/v1/token')) {
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
              name: 'Athena FHIR Server',
              version: '1.0',
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    provider = new AthenahealthProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully with valid configuration', async () => {
      await expect(provider.connect()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.athenahealth.com/v1/token',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockConfig.baseUrl}/metadata`,
        expect.any(Object)
      );
    });

    it('should throw error when base URL is missing', async () => {
      const invalidConfig = { ...mockConfig, baseUrl: '' };
      const invalidProvider = new AthenahealthProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Athenahealth base URL is required');
    });

    it('should throw error when base URL format is invalid', async () => {
      const invalidConfig = { ...mockConfig, baseUrl: 'https://invalid-url.com' };
      const invalidProvider = new AthenahealthProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Invalid Athenahealth FHIR URL format');
    });

    it('should throw error when client ID is missing', async () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      const invalidProvider = new AthenahealthProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Athenahealth client ID is required');
    });

    it('should throw error when client secret is missing', async () => {
      const invalidConfig = { ...mockConfig, clientSecret: '' };
      const invalidProvider = new AthenahealthProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Athenahealth client secret is required');
    });

    it('should throw error when scopes are missing', async () => {
      const invalidConfig = { ...mockConfig, scopes: [] };
      const invalidProvider = new AthenahealthProvider(invalidConfig);
      await expect(invalidProvider.connect()).rejects.toThrow('Athenahealth OAuth scopes are required');
    });

    it('should throw error when authentication fails', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        })
      );
      await expect(provider.connect()).rejects.toThrow('Athenahealth authentication failed: 401 Unauthorized');
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

    it('should throw error when server is not Athenahealth', async () => {
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
      await expect(provider.connect()).rejects.toThrow('Invalid Athenahealth FHIR server response');
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
        'https://api.athenahealth.com/v1/token',
        expect.any(Object)
      );
    });
  });

  describe('FHIR client', () => {
    it('should throw error when getting client before connection', () => {
      expect(() => provider.getClient()).toThrow('Athenahealth provider not connected');
    });

    it('should return FHIR client after successful connection', async () => {
      await provider.connect();
      const client = provider.getClient();
      expect(client).toBeInstanceOf(FHIRClient);
    });
  });
}); 