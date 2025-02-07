import { UserService } from "../UserService";
import { SecurityAuditService } from "../SecurityAuditService";
import { supabase } from "../../config/supabase";
import { User } from '@supabase/supabase-js';
import { UserProfile, UserSession } from "../../config/supabase";
// Mock Supabase client
jest.mock('../../config/supabase', () => ({
    supabase: {
        from: jest.fn(),
        auth: {
            admin: {
                signOut: jest.fn()
            }
        }
    }
}));
describe('UserService', () => {
    let userService: UserService;
    let securityAudit: SecurityAuditService;
    let mockUser: User;
    let mockProfile: UserProfile;
    let mockSession: UserSession;
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        // Initialize mocks
        securityAudit = {
            recordEvent: jest.fn()
        } as unknown as SecurityAuditService;
        userService = new UserService(securityAudit);
        // Mock user data
        mockUser = {
            id: 'test-user-id',
            email: 'test@example.com'
        } as User;
        mockProfile = {
            id: 'profile-id',
            user_id: mockUser.id,
            email: mockUser.email,
            full_name: 'Test User',
            status: 'active',
            preferences: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            metadata: null
        };
        mockSession = {
            id: 'session-id',
            user_id: mockUser.id,
            token: 'test-token',
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            last_activity: new Date().toISOString(),
            metadata: null
        };
        // Mock Supabase responses
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gt: jest.fn().mockReturnThis(),
            single: jest.fn()
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);
    });
    describe('getUserById', () => {
        it('should fetch user profile by ID', async () => {
            const mockResponse = { data: mockProfile, error: null };
            (supabase.from as jest.Mock)().single.mockResolvedValue(mockResponse);
            const result = await userService.getUserById(mockUser.id);
            expect(result).toEqual(mockProfile);
            expect(supabase.from).toHaveBeenCalledWith('user_profiles');
        });
        it('should throw error if fetch fails', async () => {
            const mockError = new Error('Database error');
            (supabase.from as jest.Mock)().single.mockResolvedValue({ data: null, error: mockError });
            await expect(userService.getUserById(mockUser.id)).rejects.toThrow();
        });
    });
    describe('updateUserStatus', () => {
        it('should update user status', async () => {
            const mockResponse = { error: null };
            (supabase.from as jest.Mock)().eq.mockResolvedValue(mockResponse);
            await userService.updateUserStatus(mockUser.id, 'inactive');
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('user_status_update', expect.any(Object));
        });
        it('should throw error if update fails', async () => {
            const mockError = new Error('Update failed');
            (supabase.from as jest.Mock)().eq.mockResolvedValue({ error: mockError });
            await expect(userService.updateUserStatus(mockUser.id, 'inactive')).rejects.toThrow();
        });
    });
    describe('temporaryLockAccount', () => {
        it('should lock and automatically unlock account', async () => {
            jest.useFakeTimers();
            const mockResponse = { error: null };
            (supabase.from as jest.Mock)().eq.mockResolvedValue(mockResponse);
            await userService.temporaryLockAccount(mockUser.id, 1);
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('account_temporary_lock', expect.any(Object));
            // Fast forward time
            jest.advanceTimersByTime(1000);
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('account_auto_unlocked', expect.any(Object));
            jest.useRealTimers();
        });
    });
    describe('upsertProfile', () => {
        it('should create or update user profile', async () => {
            const mockResponse = { data: mockProfile, error: null };
            (supabase.from as jest.Mock)().single.mockResolvedValue(mockResponse);
            const result = await userService.upsertProfile(mockUser, {
                full_name: 'Updated Name'
            });
            expect(result).toEqual(mockProfile);
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('profile_updated', expect.any(Object));
        });
    });
    describe('getUserSessions', () => {
        it('should fetch active user sessions', async () => {
            const mockResponse = { data: [mockSession], error: null };
            (supabase.from as jest.Mock)().gt.mockResolvedValue(mockResponse);
            const result = await userService.getUserSessions(mockUser.id);
            expect(result).toEqual([mockSession]);
            expect(supabase.from).toHaveBeenCalledWith('user_sessions');
        });
    });
    describe('createSession', () => {
        it('should create new user session', async () => {
            const mockResponse = { data: mockSession, error: null };
            (supabase.from as jest.Mock)().single.mockResolvedValue(mockResponse);
            const result = await userService.createSession(mockUser.id, '127.0.0.1', 'test-agent');
            expect(result).toEqual(mockSession);
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('session_created', expect.any(Object));
        });
    });
    describe('revokeCurrentSession', () => {
        it('should revoke user session', async () => {
            (supabase.auth.admin.signOut as jest.Mock).mockResolvedValue({ error: null });
            await userService.revokeCurrentSession(mockUser.id);
            expect(supabase.auth.admin.signOut).toHaveBeenCalledWith(mockUser.id);
            expect(securityAudit.recordEvent).toHaveBeenCalledWith('session_revoked', expect.any(Object));
        });
    });
});
