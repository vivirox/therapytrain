import { NextApiRequest, NextApiResponse } from 'next';
import { HipaaMonitoringService } from '@/lib/compliance/hipaa-monitoring';

// Valid event types for runtime validation
const VALID_EVENT_TYPES = ['phi_access', 'authentication', 'encryption'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

// Required fields for each event type
const REQUIRED_FIELDS: Record<ValidEventType, string[]> = {
  'phi_access': ['user_id', 'record_id', 'authorized'],
  'authentication': ['user_id', 'status'],
  'encryption': ['record_id', 'status', 'failure_type'],
};

function validateEventFields(event: any): { isValid: boolean; error?: string } {
  if (!VALID_EVENT_TYPES.includes(event.type)) {
    return { isValid: false, error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` };
  }

  const requiredFields = REQUIRED_FIELDS[event.type as ValidEventType];
  const missingFields = requiredFields.filter(field => !(field in event));

  if (missingFields.length > 0) {
    return { isValid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
  }

  return { isValid: true };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Rate limiting headers
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', '99'); // TODO: Implement actual rate limiting

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted',
      allowedMethods: ['POST'],
    });
  }

  const event = req.body;

  if (!event || !event.type) {
    return res.status(400).json({
      error: 'Missing event data',
      message: 'Request body must include an event type',
      example: {
        type: 'phi_access',
        user_id: 'string',
        record_id: 'string',
        authorized: 'boolean',
      },
    });
  }

  // Validate event fields
  const validation = validateEventFields(event);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation error',
      message: validation.error,
      receivedEvent: event,
    });
  }

  try {
    const timestamp = new Date().toISOString();
    const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Add metadata to event
    const enrichedEvent = {
      ...event,
      metadata: {
        ...event.metadata,
        timestamp,
        client_ip: clientIp,
        user_agent: userAgent,
        request_id: req.headers['x-request-id'] || crypto.randomUUID(),
      },
    };

    let result;
    switch (event.type) {
      case 'phi_access':
        result = await HipaaMonitoringService.handlePhiAccessChange({
          new: enrichedEvent,
          old: null,
          eventType: 'INSERT',
        });
        break;

      case 'authentication':
        result = await HipaaMonitoringService.handleAuthenticationChange({
          new: enrichedEvent,
        });
        break;

      case 'encryption':
        result = await HipaaMonitoringService.handleEncryptionChange({
          new: enrichedEvent,
        });
        break;

      default:
        return res.status(400).json({
          error: 'Invalid event type',
          message: `Event type '${event.type}' is not supported`,
          supportedTypes: VALID_EVENT_TYPES,
        });
    }

    return res.status(200).json({
      success: true,
      timestamp,
      request_id: enrichedEvent.metadata.request_id,
      result,
    });
  } catch (error) {
    console.error('Error handling HIPAA monitoring event:', {
      error,
      event_type: event.type,
      user_id: event.user_id,
      record_id: event.record_id,
    });

    const errorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Log the error with the request ID for tracking
    console.error('Error details:', {
      ...errorResponse,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return res.status(500).json(errorResponse);
  }
} 