import { EHRConfig } from '../types';
import { FHIRClient } from '../fhir-client';

interface SMARTAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  smart_style_url?: string;
}

export class EpicProvider {
  private client: FHIRClient | null = null;
  private config: EHRConfig;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(config: EHRConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Validate SMART on FHIR configuration
      this.validateConfig();

      // Get SMART authorization token
      const authResponse = await this.authenticateWithSMART();
      this.accessToken = authResponse.access_token;
      this.tokenExpiration = new Date(Date.now() + authResponse.expires_in * 1000);

      // Initialize FHIR client with SMART auth
      this.client = new FHIRClient({
        id: 'epic',
        name: 'Epic EHR',
        baseUrl: this.config.baseUrl,
        authType: 'oauth2',
        settings: {
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
          scope: this.config.scopes,
        },
      });

      // Test connection with a simple request
      await this.testConnection();
    } catch (error) {
      throw new Error(`Epic connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new Error('Epic base URL is required');
    }
    if (!this.config.clientId) {
      throw new Error('Epic client ID is required');
    }
    if (!this.config.clientSecret) {
      throw new Error('Epic client secret is required');
    }
    if (!this.config.scopes || this.config.scopes.length === 0) {
      throw new Error('Epic SMART scopes are required');
    }
  }

  private async authenticateWithSMART(): Promise<SMARTAuthResponse> {
    const tokenUrl = `${this.config.baseUrl}/oauth2/token`;
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
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`SMART authentication failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('FHIR client not initialized');
    }

    try {
      // Try to fetch the capability statement
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
      if (metadata.resourceType !== 'CapabilityStatement') {
        throw new Error('Invalid capability statement received');
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
    const authResponse = await this.authenticateWithSMART();
    this.accessToken = authResponse.access_token;
    this.tokenExpiration = new Date(Date.now() + authResponse.expires_in * 1000);
  }

  getClient(): FHIRClient {
    if (!this.client) {
      throw new Error('Epic provider not connected');
    }
    return this.client;
  }
} 