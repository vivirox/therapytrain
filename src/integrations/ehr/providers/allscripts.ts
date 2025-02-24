import { EHRConfig } from '../types';
import { FHIRClient } from '../fhir-client';

interface AllscriptsAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class AllscriptsProvider {
  private client: FHIRClient | null = null;
  private config: EHRConfig;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(config: EHRConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Validate configuration
      this.validateConfig();

      // Get OAuth2 token
      const authResponse = await this.authenticate();
      this.accessToken = authResponse.access_token;
      this.tokenExpiration = new Date(Date.now() + authResponse.expires_in * 1000);

      // Initialize FHIR client
      this.client = new FHIRClient({
        id: 'allscripts',
        name: 'Allscripts EHR',
        baseUrl: this.config.baseUrl,
        authType: 'oauth2',
        settings: {
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          scope: this.config.scopes,
        },
      });

      // Test connection
      await this.testConnection();
    } catch (error) {
      throw new Error(`Allscripts connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new Error('Allscripts base URL is required');
    }
    if (!this.config.clientId) {
      throw new Error('Allscripts client ID is required');
    }
    if (!this.config.clientSecret) {
      throw new Error('Allscripts client secret is required');
    }
    if (!this.config.scopes || this.config.scopes.length === 0) {
      throw new Error('Allscripts OAuth scopes are required');
    }

    // Validate Allscripts-specific URL format
    if (!this.config.baseUrl.includes('fhirapi')) {
      throw new Error('Invalid Allscripts FHIR URL format');
    }
  }

  private async authenticate(): Promise<AllscriptsAuthResponse> {
    const tokenUrl = `${this.config.baseUrl.replace('/fhirapi', '')}/auth/oauth2/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scopes.join(' '),
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Allscripts authentication failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('FHIR client not initialized');
    }

    try {
      // Fetch capability statement
      const response = await fetch(`${this.config.baseUrl}/metadata`, {
        headers: {
          'Accept': 'application/fhir+json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch capability statement: ${response.status} ${response.statusText}`);
      }

      const metadata = await response.json();
      
      // Validate Allscripts-specific capability statement
      if (metadata.resourceType !== 'CapabilityStatement') {
        throw new Error('Invalid capability statement received');
      }

      if (!metadata.software?.name?.toLowerCase().includes('allscripts')) {
        throw new Error('Invalid Allscripts FHIR server response');
      }

      // Validate required FHIR version
      const fhirVersion = metadata.fhirVersion;
      if (!fhirVersion || !['3.0.2', '4.0.1'].includes(fhirVersion)) {
        throw new Error(`Unsupported FHIR version: ${fhirVersion}`);
      }
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isTokenValid(): Promise<boolean> {
    if (!this.accessToken || !this.tokenExpiration) {
      return false;
    }
    // Add 5-minute buffer for token expiration
    return this.tokenExpiration.getTime() - 300000 > Date.now();
  }

  async refreshToken(): Promise<void> {
    const authResponse = await this.authenticate();
    this.accessToken = authResponse.access_token;
    this.tokenExpiration = new Date(Date.now() + authResponse.expires_in * 1000);
  }

  getClient(): FHIRClient {
    if (!this.client) {
      throw new Error('Allscripts provider not connected');
    }
    return this.client;
  }
} 