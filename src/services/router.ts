// src/services/router.ts
import analyzeMessage from '@/ai/router';
import { therapyServiceHandler } from './therapy';
import { resourceServiceHandler } from './resource';
import { appointmentServiceHandler } from './appointment';
import { generalChatHandler } from './generalChat';

async function routeMessage(message: string): Promise<any> {
  const serviceName = await analyzeMessage(message);

  switch (serviceName) {
    case 'Therapy Service':
      return therapyServiceHandler(message);
    case 'Resource Service':
      return resourceServiceHandler(message);
    case 'Appointment Service':
      return appointmentServiceHandler(message);
    case 'General Chat':
      return generalChatHandler(message);
    default:
      return generalChatHandler(message); // Default to general chat
  }
}

export default routeMessage;