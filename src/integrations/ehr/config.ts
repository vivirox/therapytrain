import { EHRConfig } from './types';

// Default configuration
export const defaultConfig: EHRConfig = {
  providers: [],
  defaultProvider: '',
  auditLogEnabled: true,
  cacheDuration: 300, // 5 minutes
  retryAttempts: 3,
  timeout: 30000, // 30 seconds
};

let currentConfig: EHRConfig = { ...defaultConfig };

export function getConfig(): EHRConfig {
  return { ...currentConfig };
}

export function setConfig(config: Partial<EHRConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  };

  // Validate configuration
  validateConfig(currentConfig);
}

function validateConfig(config: EHRConfig): void {
  // Validate providers
  if (config.providers.length > 0 && !config.defaultProvider) {
    throw new Error('Default provider must be specified when providers are configured');
  }

  if (config.defaultProvider && !config.providers.find(p => p.id === config.defaultProvider)) {
    throw new Error('Default provider must be one of the configured providers');
  }

  // Validate provider configurations
  config.providers.forEach(provider => {
    if (!provider.id || !provider.name || !provider.baseUrl) {
      throw new Error('Provider must have id, name, and baseUrl');
    }

    switch (provider.authType) {
      case 'oauth2':
        if (!provider.settings.clientId || !provider.settings.clientSecret) {
          throw new Error('OAuth2 provider must have clientId and clientSecret');
        }
        break;
      case 'apikey':
        if (!provider.settings.apiKey) {
          throw new Error('API key provider must have apiKey');
        }
        break;
      case 'basic':
        if (!provider.settings.username || !provider.settings.password) {
          throw new Error('Basic auth provider must have username and password');
        }
        break;
      default:
        throw new Error('Invalid auth type');
    }
  });

  // Validate numeric values
  if (config.cacheDuration <= 0) {
    throw new Error('Cache duration must be positive');
  }

  if (config.retryAttempts < 0) {
    throw new Error('Retry attempts must be non-negative');
  }

  if (config.timeout <= 0) {
    throw new Error('Timeout must be positive');
  }
}

// Initialize with environment variables if available
if (typeof process !== 'undefined' && process.env) {
  const envConfig: Partial<EHRConfig> = {
    auditLogEnabled: process.env.EHR_AUDIT_ENABLED === 'true',
    cacheDuration: parseInt(process.env.EHR_CACHE_DURATION || '300', 10),
    retryAttempts: parseInt(process.env.EHR_RETRY_ATTEMPTS || '3', 10),
    timeout: parseInt(process.env.EHR_TIMEOUT || '30000', 10),
  };

  setConfig(envConfig);
} 