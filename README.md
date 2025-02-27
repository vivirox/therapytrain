# Gradiant EHR Integration Platform

A comprehensive platform for integrating with Electronic Health Record (EHR) systems, providing a secure, scalable, and HIPAA-compliant solution for healthcare applications.

## Features

### Core Integration
- **Multi-Provider Support**: Seamless integration with major EHR providers:
  - Epic
  - Cerner
  - Allscripts
  - Athenahealth
- **FHIR Resource Support**: Comprehensive implementation of FHIR resources:
  - Patient
  - Practitioner
  - Organization
  - PractitionerRole
- **HIPAA Compliance**: Built-in HIPAA-compliant audit logging and security measures

### Advanced Features
- **Data Synchronization**: Real-time data synchronization with conflict resolution
- **Webhooks**: Event-driven architecture with secure webhook delivery
- **Batch Processing**: Efficient handling of large-scale data operations
- **Rate Limiting**: Intelligent rate limiting with provider-specific configurations
- **Caching**: Advanced caching strategies (LRU, TTL) for improved performance
- **Performance Monitoring**: Comprehensive metrics and alerting system
- **Bulk Data Export**: FHIR bulk data export with chunked processing
- **Plugin System**: Extensible plugin architecture with marketplace

### Security & Compliance
- HIPAA-compliant audit logging
- Secure authentication and authorization
- Data encryption at rest and in transit
- Resource-level access control
- Security event monitoring and alerting

### Developer Experience
- **Plugin Marketplace**: Discover, publish, and manage plugins
- **API Documentation**: Comprehensive API documentation
- **Developer Tools**: CLI tools and SDK for plugin development
- **Example Plugins**: Ready-to-use example plugins
- **Monitoring Dashboard**: Real-time system monitoring

## Getting Started

### Prerequisites
- Node.js 18 or later
- pnpm 8 or later
- PostgreSQL 14 or later
- Redis 6 or later

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gradiant.git
   cd gradiant
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Initialize the database:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

### Configuration

The platform can be configured through environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/therapytrain

# Redis
REDIS_URL=redis://localhost:6379

# EHR Providers
EPIC_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
EPIC_CLIENT_ID=your-client-id
EPIC_CLIENT_SECRET=your-client-secret

CERNER_BASE_URL=https://fhir-ehr.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
CERNER_CLIENT_ID=your-client-id
CERNER_CLIENT_SECRET=your-client-secret

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
```

See [Configuration Guide](docs/configuration.md) for detailed configuration options.

### Usage Examples

#### Basic EHR Integration
```typescript
import { EHRIntegrationService } from '@gradiant/ehr';

// Configure EHR provider
await ehrService.configureEHRProvider('epic-provider', {
  vendor: 'epic',
  baseUrl: process.env.EPIC_BASE_URL,
  clientId: process.env.EPIC_CLIENT_ID,
  clientSecret: process.env.EPIC_CLIENT_SECRET,
  scopes: ['patient/*.read', 'user/*.read'],
});

// Connect to EHR
await ehrService.connect('epic-provider');

// Get FHIR client
const client = ehrService.getFHIRClient('epic-provider');

// Search for patients
const patients = await client.searchResources('Patient', {
  name: 'John',
  birthdate: '1970-01-01',
});
```

#### Using Webhooks
```typescript
import { WebhookService } from '@gradiant/ehr';

// Register webhook
await webhookService.registerWebhook('my-webhook', {
  url: 'https://my-app.com/webhooks',
  secret: 'my-webhook-secret',
  events: ['patient.created', 'patient.updated'],
});

// The webhook will receive events in this format:
{
  "id": "evt_123",
  "event": "patient.created",
  "data": {
    "resourceType": "Patient",
    "id": "123",
    // ... patient data
  },
  "timestamp": "2024-03-20T12:00:00Z"
}
```

#### Creating a Plugin
```typescript
import { PluginAPI } from '@gradiant/ehr';

export function initialize(api: PluginAPI) {
  // Subscribe to events
  api.events.on('patient.created', async (patient) => {
    // Process new patient
    const enrichedData = await processPatient(patient);
    
    // Store processed data
    await api.storage.set(`patient-${patient.id}`, enrichedData);
    
    // Emit custom event
    api.events.emit('patient.enriched', enrichedData);
  });
}

export function cleanup() {
  // Cleanup resources
}
```

See [Examples](docs/examples) directory for more usage examples.

## Documentation

- [API Reference](docs/api/README.md)
- [Configuration Guide](docs/configuration.md)
- [Deployment Guide](docs/deployment.md)
- [Plugin Development](docs/plugins/README.md)
- [Security Guide](docs/security.md)
- [Monitoring Guide](docs/monitoring.md)
- [Contributing Guide](CONTRIBUTING.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [Issue Tracker](https://github.com/yourusername/gradiant/issues)
- [Documentation](https://docs.gemcity.xyz)
- [Community Forum](https://community.gemcity.xyz)

## Acknowledgments

- HAPI FHIR for the FHIR implementation
- SMART on FHIR for the authentication framework
- HL7 for the FHIR standard

[![Deploy](https://github.com/vivirox/gradiant/actions/workflows/deploy.yml/badge.svg)](https://github.com/vivirox/gradiant/actions/workflows/deploy.yml)
[![CI/CD Pipeline](https://github.com/vivirox/gradiant/actions/workflows/main.yml/badge.svg)](https://github.com/vivirox/gradiant/actions/workflows/main.yml)

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The main workflow (`main.yml`) handles:

1. **Environment Setup**: Creates necessary environment files for testing
2. **JavaScript Tests**: Runs type checking, linting, and unit tests
3. **Python Tests**: Runs Python-based tests if applicable
4. **End-to-End Tests**: (Currently disabled) Runs Playwright tests
5. **Deployment**:
   - **Staging**: Deploys preview builds for pull requests
   - **Production**: Deploys to production when code is merged to main

### Troubleshooting GitHub Actions

If you encounter GitHub Action failures, check the following:

1. **Environment Files**: Make sure `.env.example` and `.env.test` are present
2. **MP-SPDZ Setup**: The workflow includes basic MP-SPDZ directory setup
3. **Dependency Installation**: Check if all package installations succeed
4. **Test Failures**: Review test output for specific error messages

### Requirements Update

- Node.js 22 or later (updated from 18)
- pnpm 10 or later (updated from 8)
- PostgreSQL 14 or later
- Redis 6 or later
