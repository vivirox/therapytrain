# Security Monitoring System

A comprehensive security monitoring system for the TherapyTrain platform that provides real-time alerts, notifications, and automated responses to security events.

## Features

- Real-time security event monitoring
- Multiple alert severity levels
- Configurable notification channels (Email, Webhook, Slack)
- Automated response actions
- Detailed security audit logging
- Scalable and extensible architecture

## Components

### Alert Types

The system monitors several types of security events:

- `AUTH_FAILURE`: Authentication-related failures
- `UNUSUAL_ACCESS`: Suspicious access patterns
- `DATA_VIOLATION`: Data access violations
- `RATE_LIMIT_BREACH`: API rate limit violations
- `SYSTEM_HEALTH`: System health-related issues

### Alert Severity Levels

Each alert is assigned a severity level:

- `CRITICAL`: Immediate action required
- `HIGH`: Action required within 1 hour
- `MEDIUM`: Action required within 24 hours
- `LOW`: Informational, no immediate action required

## Usage

### Basic Alert Creation

```typescript
import { AlertManager, AlertType, AlertSeverity } from './security';

const alertManager = AlertManager.getInstance();

// Create a basic alert
await alertManager.createAlert(
  AlertType.AUTH_FAILURE,
  AlertSeverity.HIGH,
  'Failed login attempt',
  { userId: 'user123', ipAddress: '192.168.1.1' }
);

// Use convenience methods for common scenarios
await alertManager.handleAuthFailure('user123', '192.168.1.1');
await alertManager.handleUnusualAccess('user123', '/api/sensitive', 'Multiple failed attempts');
await alertManager.handleRateLimitBreach('192.168.1.1', '/api/login', 100);
```

### Configuring Notifications

```typescript
import { NotificationHandler, NotificationConfig } from './security';

const config: NotificationConfig = {
  email: {
    recipients: ['security@example.com']
  },
  webhook: {
    url: 'https://api.example.com/security-webhook',
    headers: { 'X-API-Key': 'your-api-key' }
  },
  slack: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    channel: '#security-alerts'
  }
};

const notificationHandler = new NotificationHandler(config);
alertManager.registerHandler(notificationHandler);
```

### Adding Automated Responses

```typescript
import { AutomatedResponseHandler } from './security';

const automatedResponseHandler = new AutomatedResponseHandler(
  userService,
  rateLimiterService,
  securityAuditService
);

alertManager.registerHandler(automatedResponseHandler);
```

## Environment Variables

The following environment variables are required for email notifications:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=alerts@example.com
```

## Testing

The security monitoring system includes comprehensive test coverage. Run the tests using:

```bash
npm test src/security/__tests__
```

## Best Practices

1. **Centralized Management**: Always use the singleton `AlertManager` instance to ensure centralized alert handling.
2. **Error Handling**: Implement proper error handling and ensure critical operations complete.
3. **Logging**: Use the logging system for debugging and audit trails.
4. **Configuration**: Store sensitive configuration in environment variables.
5. **Testing**: Add tests for new alert types and handlers.

## Contributing

When adding new features to the security monitoring system:

1. Define new alert types in `types.ts`
2. Implement corresponding handlers
3. Add comprehensive tests
4. Update documentation
5. Follow TypeScript best practices

## Architecture

```
security/
├── types.ts                    # Type definitions and interfaces
├── AlertManager.ts            # Central alert management
├── NotificationHandler.ts     # Alert notifications
├── AutomatedResponseHandler.ts # Automated responses
├── __tests__/                 # Test files
└── README.md                  # Documentation
```

## Error Handling

The system implements robust error handling:

1. All handlers continue processing even if one fails
2. Failed notifications are logged but don't block other notifications
3. Critical security actions are prioritized
4. All errors are logged for debugging

## Monitoring and Maintenance

1. Regular review of security logs
2. Monitor notification delivery success rates
3. Audit automated response effectiveness
4. Update security rules and thresholds as needed
