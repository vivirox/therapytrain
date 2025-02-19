import { ChatService } from '@/services/chat/ChatService';
import { ZKService } from '../ZKService';
import { ForwardSecrecyService } from '../ForwardSecrecyService';
import { createClient } from '@supabase/supabase-js';
import { ChatMessage, MessageStatus } from '@/types/chat';

// Mock WebSocket
class MockWebSocket {
  onmessage: ((data: any) => void) | null = null;
  send = jest.fn();
  close = jest.fn();
}

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      data: []
    })
  }))
}));

describe('Chat Forward Secrecy E2E', () => {
  let chatService: ChatService;
  let zkService: ZKService;
  let forwardSecrecy: ForwardSecrecyService;
  let mockWs: MockWebSocket;

  const threadId = 'test-thread-id';
  const aliceId = 'alice-id';
  const bobId = 'bob-id';

  beforeEach(() => {
    mockWs = new MockWebSocket();
    chatService = ChatService.getInstance(createClient('test-url', 'test-key'));
    zkService = ZKService.getInstance();
    forwardSecrecy = ForwardSecrecyService.getInstance();

    // Register mock clients
    chatService['clients'].set(aliceId, { ws: mockWs as any, userId: aliceId });
    chatService['clients'].set(bobId, { ws: mockWs as any, userId: bobId });
  });

  describe('Secure Chat Flow', () => {
    it('should maintain forward secrecy in a full chat flow', async () => {
      // Initialize session keys
      const aliceKeys = await zkService.getOrCreateSessionKeys(threadId);
      const bobKeys = await zkService.getOrCreateSessionKeys(threadId);

      // Create messages
      const messages = [
        {
          id: 'msg1',
          threadId,
          senderId: aliceId,
          recipientId: bobId,
          content: 'Hello Bob!',
          timestamp: new Date(),
          status: MessageStatus.PENDING
        },
        {
          id: 'msg2',
          threadId,
          senderId: bobId,
          recipientId: aliceId,
          content: 'Hi Alice!',
          timestamp: new Date(),
          status: MessageStatus.PENDING
        },
        {
          id: 'msg3',
          threadId,
          senderId: aliceId,
          recipientId: bobId,
          content: 'How are you?',
          timestamp: new Date(),
          status: MessageStatus.PENDING
        }
      ] as ChatMessage[];

      // Send messages
      for (const message of messages) {
        await chatService.sendMessage(message);
      }

      // Verify WebSocket messages were sent
      expect(mockWs.send).toHaveBeenCalledTimes(3);

      // Parse sent messages
      const sentMessages = mockWs.send.mock.calls.map(call => 
        JSON.parse(call[0])
      );

      // Verify each message has the necessary forward secrecy metadata
      for (const sent of sentMessages) {
        expect(sent.payload).toHaveProperty('messageNumber');
        expect(sent.payload).toHaveProperty('previousChainLength');
        expect(sent.payload).toHaveProperty('iv');
        expect(sent.payload).toHaveProperty('proof');
      }

      // Verify key rotation
      const uniqueIVs = new Set(sentMessages.map(m => m.payload.iv));
      expect(uniqueIVs.size).toBe(sentMessages.length); // Each message should have a unique IV

      // Simulate key compromise by creating new session
      const compromisedKeys = await zkService.getOrCreateSessionKeys(threadId);

      // Try to decrypt messages with compromised keys
      for (const sent of sentMessages) {
        await expect(
          zkService.decryptMessageWithSessionKey(
            sent.payload.encryptedContent,
            sent.payload.iv,
            compromisedKeys.privateKey,
            {
              threadId,
              messageNumber: sent.payload.messageNumber,
              previousChainLength: sent.payload.previousChainLength
            }
          )
        ).rejects.toThrow();
      }
    });

    it('should handle concurrent messages with forward secrecy', async () => {
      // Initialize session keys
      await zkService.getOrCreateSessionKeys(threadId);

      // Create concurrent messages
      const messages = await Promise.all([
        chatService.sendMessage({
          id: 'concurrent1',
          threadId,
          senderId: aliceId,
          recipientId: bobId,
          content: 'Concurrent message 1',
          timestamp: new Date(),
          status: MessageStatus.PENDING
        }),
        chatService.sendMessage({
          id: 'concurrent2',
          threadId,
          senderId: bobId,
          recipientId: aliceId,
          content: 'Concurrent message 2',
          timestamp: new Date(),
          status: MessageStatus.PENDING
        })
      ]);

      // Verify messages were sent
      expect(mockWs.send).toHaveBeenCalledTimes(2);

      // Parse sent messages
      const sentMessages = mockWs.send.mock.calls.map(call => 
        JSON.parse(call[0])
      );

      // Verify message ordering and key rotation
      expect(sentMessages[0].payload.messageNumber).toBeLessThan(
        sentMessages[1].payload.messageNumber
      );
      expect(sentMessages[0].payload.iv).not.toBe(sentMessages[1].payload.iv);
    });

    it('should maintain forward secrecy with message recovery', async () => {
      // Initialize session keys
      await zkService.getOrCreateSessionKeys(threadId);

      // Send a message that will fail
      const failedMessage: ChatMessage = {
        id: 'failed1',
        threadId,
        senderId: aliceId,
        recipientId: bobId,
        content: 'This message will fail',
        timestamp: new Date(),
        status: MessageStatus.PENDING
      };

      // Force message to fail
      mockWs.send.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      // Attempt to send message (will fail)
      await expect(chatService.sendMessage(failedMessage)).rejects.toThrow();

      // Recover the message
      await chatService.recoverThreadMessages(threadId);

      // Verify recovered message has new encryption keys
      const recoveredCalls = mockWs.send.mock.calls.slice(-1);
      const recoveredMessage = JSON.parse(recoveredCalls[0][0]);

      expect(recoveredMessage.payload.iv).toBeDefined();
      expect(recoveredMessage.payload.messageNumber).toBeDefined();
      expect(recoveredMessage.payload.previousChainLength).toBeDefined();

      // Verify original encryption keys can't decrypt recovered message
      const originalKeys = await zkService.getSessionKeys(threadId);
      if (originalKeys) {
        await expect(
          zkService.decryptMessageWithSessionKey(
            recoveredMessage.payload.encryptedContent,
            recoveredMessage.payload.iv,
            originalKeys.privateKey,
            {
              threadId,
              messageNumber: recoveredMessage.payload.messageNumber,
              previousChainLength: recoveredMessage.payload.previousChainLength
            }
          )
        ).rejects.toThrow();
      }
    });
  });
}); 