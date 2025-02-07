import { Request, Response, NextFunction } from 'express';
import { supabase } from "@/lib/supabase";
import { Session } from "@/types/database.types";
import { z } from 'zod';
import { verifyProof } from 'snarkjs';
import fs from 'fs';
import { SecurityAuditService } from "@/services/SecurityAuditService";
const startSessionSchema = z.object({
    clientId: z.string(),
    mode: z.enum(['chat', 'voice', 'video'])
});
export class SessionController {
    private securityAudit: SecurityAuditService;
    constructor() {
        this.securityAudit = SecurityAuditService.getInstance();
    }
    async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { clientId, mode } = startSessionSchema.parse(req.body);
            const { data, error } = await supabase
                .from('sessions')
                .insert({ clientId, mode })
                .select()
                .single();
            if (error) {
                await this.securityAudit.logSessionEvent(clientId, 'CREATE_FAILED', {
                    error: error.message,
                    mode,
                    userId: req.user?.id
                });
                throw error;
            }
            await this.securityAudit.logSessionEvent(data.id, 'CREATED', {
                mode,
                userId: req.user?.id,
                clientId
            });
            res.status(201).json(data);
        }
        catch (error) {
            next(error);
        }
    }
    async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                await this.securityAudit.logDataAccess(req.user?.id || 'unknown', 'sessions', 'LIST', {
                    error: error.message,
                    status: 'failure'
                });
                throw error;
            }
            await this.securityAudit.logDataAccess(req.user?.id || 'unknown', 'sessions', 'LIST', {
                count: data.length,
                status: 'success'
            });
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                await this.securityAudit.logDataAccess(req.user?.id || 'unknown', 'sessions', 'READ', {
                    sessionId: id,
                    error: error.message,
                    status: 'failure'
                });
                throw error;
            }
            if (!data) {
                await this.securityAudit.logDataAccess(req.user?.id || 'unknown', 'sessions', 'READ', {
                    sessionId: id,
                    error: 'Session not found',
                    status: 'failure'
                });
                res.status(404).json({ error: 'Session not found' });
                return;
            }
            await this.securityAudit.logDataAccess(req.user?.id || 'unknown', 'sessions', 'READ', {
                sessionId: id,
                status: 'success'
            });
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    async updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('sessions')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                await this.securityAudit.logSessionEvent(id, 'UPDATE_FAILED', {
                    error: error.message,
                    userId: req.user?.id,
                    updates: req.body
                });
                throw error;
            }
            if (!data) {
                await this.securityAudit.logSessionEvent(id, 'UPDATE_FAILED', {
                    error: 'Session not found',
                    userId: req.user?.id,
                    updates: req.body
                });
                res.status(404).json({ error: 'Session not found' });
                return;
            }
            await this.securityAudit.logSessionEvent(id, 'UPDATED', {
                userId: req.user?.id,
                updates: req.body
            });
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('id', id);
            if (error) {
                await this.securityAudit.logSessionEvent(id, 'DELETE_FAILED', {
                    error: error.message,
                    userId: req.user?.id
                });
                throw error;
            }
            await this.securityAudit.logSessionEvent(id, 'DELETED', {
                userId: req.user?.id
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { data: { session }, error } = await supabase.auth.signInWithPassword({
                email: req.body.email,
                password: req.body.password
            });
            if (error) {
                await this.securityAudit.recordAuthAttempt('unknown', false, {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    method: 'password',
                    error: error.message
                });
                throw error;
            }
            await this.securityAudit.recordAuthAttempt(session.user.id, true, {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                method: 'password'
            });
            res.json(session);
        }
        catch (error) {
            next(error);
        }
    }
    async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) {
                await this.securityAudit.recordEvent('USER_SIGNUP_FAILED', {
                    email,
                    error: error.message,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });
                throw error;
            }
            await this.securityAudit.recordEvent('USER_SIGNUP_SUCCESS', {
                userId: data.user?.id,
                email,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            res.status(201).json({ user: data.user });
        }
        catch (error) {
            next(error);
        }
    }
    async validateSessionProof(proof: any, publicSignals: string[]) {
        const vKey = JSON.parse(fs.readFileSync('build/verification_key.json', 'utf-8'));
        return await verifyProof(vKey, proof, publicSignals);
    }
}
export default SessionController;
