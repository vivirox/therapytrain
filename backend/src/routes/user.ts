import { Router, Request, Response, RequestHandler, NextFunction } from 'express';
import { UserService } from "@/services/UserService";
import { SecurityAuditService } from "@/services/SecurityAuditService";
import { User, SupabaseClient, Session } from '@supabase/supabase-js';
import { UserProfile } from "@/config/supabase";
const router = Router();
const securityAudit = new SecurityAuditService();
const userService = new UserService(securityAudit);
// Get user profile
const getProfile: RequestHandler = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const profile = await userService.getUserById(userId);
        if (!profile) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        res.json({ profile });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};
// Update user profile
const updateProfile: RequestHandler = async (req, res) => {
    try {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const profile: Partial<UserProfile> = {
            full_name: req.body.fullName,
            preferred_name: req.body.preferredName,
            avatar_url: req.body.avatarUrl,
            preferences: req.body.preferences
        };
        const updatedProfile = await userService.upsertProfile(user, profile);
        res.json({ profile: updatedProfile });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};
// Get user sessions
const getSessions: RequestHandler = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const sessions = await userService.getUserSessions(userId);
        res.json({ sessions });
    }
    catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};
// Revoke session
const revokeSession: RequestHandler = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        await userService.revokeCurrentSession(userId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error revoking session:', error);
        res.status(500).json({ error: 'Failed to revoke session' });
    }
};
// Update user preferences
const updatePreferences: RequestHandler = async (req, res) => {
    try {
        const user = req.user as User;
        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const profile = await userService.getUserById(user.id);
        if (!profile) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        const updatedProfile = await userService.upsertProfile(user, {
            preferences: {
                ...profile.preferences,
                ...req.body.preferences
            }
        });
        res.json({ preferences: updatedProfile.preferences });
    }
    catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
};
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/sessions', getSessions);
router.post('/sessions/revoke', revokeSession);
router.put('/preferences', updatePreferences);
export default router;

export interface Database {
    public: { Tables: { [key: string]: any } };
}
