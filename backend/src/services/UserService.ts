import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { UserProfile, UserSession } from '../config/supabase';
import { SecurityAuditService } from './SecurityAuditService';

export class UserService {
  constructor(private securityAudit: SecurityAuditService) {}

  /**
   * Get a user's profile by their ID
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update a user's status
   */
  async updateUserStatus(id: string, status: 'active' | 'inactive' | 'locked'): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id);

    if (error) {
      console.error('Error updating user status:', error);
      throw error;
    }

    await this.securityAudit.recordEvent('user_status_update', {
      userId: id,
      newStatus: status,
      timestamp: Date.now()
    });
  }

  /**
   * Get a user by their email address
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }

    return data;
  }

  /**
   * Temporarily lock a user's account
   */
  async temporaryLockAccount(userId: string, duration: number = 3600): Promise<void> {
    // Update user status
    await this.updateUserStatus(userId, 'locked');

    // Schedule unlock
    setTimeout(async () => {
      try {
        await this.updateUserStatus(userId, 'active');
        await this.securityAudit.recordEvent('account_auto_unlocked', {
          userId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error unlocking account:', error);
      }
    }, duration * 1000);

    await this.securityAudit.recordEvent('account_temporary_lock', {
      userId,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Revoke access to a specific resource
   */
  async revokeResourceAccess(userId: string, resourceId: string): Promise<void> {
    const { error } = await supabase
      .from('user_resources')
      .update({ revoked: true })
      .eq('user_id', userId)
      .eq('resource_id', resourceId);

    if (error) {
      console.error('Error revoking resource access:', error);
      throw error;
    }

    await this.securityAudit.recordEvent('resource_access_revoked', {
      userId,
      resourceId,
      timestamp: Date.now()
    });
  }

  /**
   * Revoke the current session
   */
  async revokeCurrentSession(userId: string): Promise<void> {
    const { error } = await supabase.auth.admin.signOut(userId);

    if (error) {
      console.error('Error revoking session:', error);
      throw error;
    }

    await this.securityAudit.recordEvent('session_revoked', {
      userId,
      timestamp: Date.now()
    });
  }

  /**
   * Create or update a user profile
   */
  async upsertProfile(user: User, profile: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        ...profile,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      throw error;
    }

    await this.securityAudit.recordEvent('profile_updated', {
      userId: user.id,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, ip: string, userAgent: string): Promise<UserSession> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        last_activity: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }

    await this.securityAudit.recordEvent('session_created', {
      userId,
      sessionId: data.id,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  }
}
