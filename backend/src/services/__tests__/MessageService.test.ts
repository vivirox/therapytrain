import { MessageService } from '@/MessageService';
import { SecurityAuditService } from '@/SecurityAuditService';
import { supabase } from '@/../config/supabase';

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('MessageService', () => {
  let messageService: MessageService;
  let mockSecurityAudit: jest.Mocked<SecurityAuditService>;

  beforeEach(() => {
    mockSecurityAudit = {
      recordEvent: jest.fn()
    } as any;

    messageService = new MessageService(mockSecurityAudit);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new chat session', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const userId = 'test-user';
      const sessionId = await messageService.createSession(userId);

      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: userId,
        metadata: expect.any(Object)
      }));
      expect(sessionId).toBeTruthy();
    });

    it('should handle errors when creating session', async () => {
      const mockError = new Error('Database error');
      const mockInsert = jest.fn().mockResolvedValue({ error: mockError });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      await expect(messageService.createSession('test-user'))
        .rejects.toThrow('Database error');
      
      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'session_creation_error',
        expect.any(Object)
      );
    });
  });

  describe('saveMessage', () => {
    it('should save a message and return it', async () => {
      const mockMessage = {
        id: 'msg-id',
        content: 'test message',
        user_id: 'user-id',
        session_id: 'session-id',
        type: 'message',
        created_at: new Date().toISOString()
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockMessage,
            error: null
          })
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      const result = await messageService.saveMessage(
        'session-id',
        'user-id',
        'test message',
        'message'
      );

      expect(result).toEqual(mockMessage);
      expect(supabase.from).toHaveBeenCalledWith('messages');
    });

    it('should handle errors when saving message', async () => {
      const mockError = new Error('Database error');
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            error: mockError
          })
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert
      });

      await expect(messageService.saveMessage(
        'session-id',
        'user-id',
        'test message',
        'message'
      )).rejects.toThrow('Database error');

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'message_save_error',
        expect.any(Object)
      );
    });
  });

  describe('getSessionMessages', () => {
    it('should retrieve messages for a session', async () => {
      const mockMessages = [
        { id: 'msg1', content: 'test 1' },
        { id: 'msg2', content: 'test 2' }
      ];

      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockMessages,
          error: null
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      const result = await messageService.getSessionMessages('session-id');

      expect(result).toEqual(mockMessages);
      expect(supabase.from).toHaveBeenCalledWith('messages');
    });

    it('should handle errors when retrieving messages', async () => {
      const mockError = new Error('Database error');
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          error: mockError
        })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect
      });

      await expect(messageService.getSessionMessages('session-id'))
        .rejects.toThrow('Database error');

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'message_fetch_error',
        expect.any(Object)
      );
    });
  });

  describe('endSession', () => {
    it('should update session end time', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      await messageService.endSession('session-id');

      expect(supabase.from).toHaveBeenCalledWith('chat_sessions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ended_at: expect.any(String)
        })
      );
    });

    it('should handle errors when ending session', async () => {
      const mockError = new Error('Database error');
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: mockError })
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate
      });

      await expect(messageService.endSession('session-id'))
        .rejects.toThrow('Database error');

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        'session_end_error',
        expect.any(Object)
      );
    });
  });
});
