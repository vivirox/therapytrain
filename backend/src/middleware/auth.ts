import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { SecurityAuditService } from '../services/SecurityAuditService';

/**
 * Middleware to authenticate requests using Supabase JWT
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const securityAudit = SecurityAuditService.getInstance();

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            await securityAudit.recordAuthAttempt('unknown', false, {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                method: 'token',
                error: 'No authorization header'
            });
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            await securityAudit.recordAuthAttempt('unknown', false, {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                method: 'token',
                error: 'No token provided'
            });
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            await securityAudit.recordAuthAttempt('unknown', false, {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                method: 'token',
                error: error?.message || 'Invalid token'
            });
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Log successful authentication
        await securityAudit.recordAuthAttempt(user.id, true, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            method: 'token'
        });

        // Add user object to request
        req.user = user;

        // Log access pattern
        await securityAudit.logAccessPattern(user.id, req.path, {
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        next();
    } catch (error) {
        console.error('Auth error:', error);
        await securityAudit.recordAuthAttempt('unknown', false, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            method: 'token',
            error: 'Authentication error'
        });
        return res.status(500).json({ error: 'Authentication error' });
    }
};

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
