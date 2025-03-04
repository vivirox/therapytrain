import { Timestamps, Metadata } from '../common';

export interface Message extends Timestamps {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'action';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  metadata?: Metadata;
}

export const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
} as const;

export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus]; 