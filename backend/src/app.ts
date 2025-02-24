// @ts-nocheck
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { SecurityHeadersService } from "./security/SecurityHeadersService";
import { SecurityAuditService } from "./services/SecurityAuditService";
import { WebAuthnService } from "./security/WebAuthnService";
import { SecurityIncidentService } from "./security/SecurityIncidentService";
import { AccountRecoveryService } from "./security/AccountRecoveryService";
import { NotificationService } from "./security/NotificationService";
import { securityConfig, corsConfig, rateLimitConfig, helmetConfig } from "./config/security.config";
import { IncidentType } from './types/security';
import { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationCredentialJSON, AuthenticationCredentialJSON } from "@simplewebauthn/browser";
import { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationCredentialJSON, AuthenticationCredentialJSON } from "@simplewebauthn/browser";

// Type definitions for request bodies
interface WebAuthnRegisterRequest {
    userId: string;
    username: string;
    devices?: string[];
}

interface WebAuthnVerifyRequest {
    userId: string;
    username: string;
    verification: unknown;
}

interface BackupCodeRequest {
    userId: string;
}

interface VerifyBackupCodeRequest extends BackupCodeRequest {
    code: string;
}

interface SecurityQuestionsRequest extends BackupCodeRequest {
    questions: Array<{ question: string; answer: string; }>;
}

interface VerifySecurityQuestionsRequest extends BackupCodeRequest {
    answers: Array<{ question: string; answer: string; }>;
}

interface SecurityIncident {
    type: IncidentType;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp: Date;
    sourceIp: string;
    userId?: string;
    details: Record<string, unknown>;
    resolved: boolean;
}

// Type-safe middleware
type TypedRequestBody<T> = Request<unknown, unknown, T>;
type TypedResponse<T> = Response<T>;

export async function createApp() {
    const app = express();
    const securityAuditService = new SecurityAuditService();
    const webAuthnService = new WebAuthnService(securityAuditService);
    const notificationService = new NotificationService(securityAuditService);
    const securityIncidentService = new SecurityIncidentService(securityAuditService, webAuthnService);
    const accountRecoveryService = new AccountRecoveryService(securityAuditService);
    const securityHeadersService = new SecurityHeadersService(securityAuditService, securityConfig);
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Security middleware
    app.use(helmet(helmetConfig));
    app.use(cors(corsConfig));
    // Custom rate limit middleware with incident tracking
    const rateLimitMiddleware = rateLimit({
        ...rateLimitConfig,
        handler: async (req: Request, res: Response) => {
            const ip = req.ip;
            await securityIncidentService.handleRateLimit(ip);
            res.status(429).json({
                error: 'Too many requests, please try again later.'
            });
        }
    });
    app.use(rateLimitMiddleware);
    // Security headers middleware
    app.use(securityHeadersService.middleware());
    // IP blocking middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (securityIncidentService.isIpBlocked(req.ip)) {
            return res.status(403).json({
                error: 'Access denied due to suspicious activity.'
            });
        }
        next();
    });
    // WebAuthn endpoints
    app.post('/api/auth/webauthn/register', 
        async (req: TypedRequestBody<WebAuthnRegisterRequest>, res: TypedResponse<unknown>) => {
        try {
            const { userId, username, devices } = req.body;
            const options = await webAuthnService.generateRegistrationOptions(userId, username, devices);
            res.json(options);
        } catch (error) {
            const incident: SecurityIncident = {
                type: 'WEBAUTHN_VIOLATION',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    endpoint: '/register'
                },
                resolved: false
            };
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(400).json({
                error: 'Failed to generate registration options'
            });
        }
    });
    app.post('/api/auth/webauthn/verify', 
        async (req: TypedRequestBody<WebAuthnVerifyRequest>, res: TypedResponse<unknown>) => {
        try {
            const { userId, username, verification } = req.body;
            const result = await webAuthnService.verifyRegistration(userId, username, verification);
            res.json(result);
        } catch (error) {
            const incident: SecurityIncident = {
                type: 'WEBAUTHN_VIOLATION',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    endpoint: '/verify'
                },
                resolved: false
            };
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(400).json({
                error: 'Failed to verify registration'
            });
        }
    });
    // Account recovery endpoints
    app.post('/api/auth/backup-codes/generate', 
        async (req: TypedRequestBody<BackupCodeRequest>, res: TypedResponse<{ codes: string[] }>) => {
        try {
            const { userId } = req.body;
            const codes = await accountRecoveryService.generateBackupCodes(userId);
            res.json({ codes });
        } catch (error) {
            const incident: SecurityIncident = {
                type: 'AUTHENTICATION_FAILURE',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'generate_backup_codes'
                },
                resolved: false
            };
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(500).json({
                error: 'Failed to generate backup codes'
            });
        }
    });
    app.post('/api/auth/backup-codes/verify', 
        async (req: TypedRequestBody<VerifyBackupCodeRequest>, res: TypedResponse<{ valid: boolean }>) => {
        try {
            const { userId, code } = req.body;
            const isValid = await accountRecoveryService.verifyBackupCode(userId, code);
            res.json({ valid: isValid });
        } catch (error) {
            const incident: SecurityIncident = {
                type: 'AUTHENTICATION_FAILURE',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'verify_backup_code'
                },
                resolved: false
            };
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(500).json({
                error: 'Failed to verify backup code'
            });
        }
    });
    app.post('/api/auth/security-questions/set', 
        async (req: TypedRequestBody<SecurityQuestionsRequest>, res: TypedResponse<void>) => {
        try {
            const { userId, questions } = req.body;
            await accountRecoveryService.setSecurityQuestions(userId, questions);
            res.status(204).end();
        } catch (error) {
            const incident: SecurityIncident = {
                type: 'AUTHENTICATION_FAILURE',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'set_security_questions'
                },
                resolved: false
            };
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(500).json({
                error: 'Failed to set security questions'
            });
        }
    });
    app.post('/api/auth/security-questions/verify', 
        async (req: TypedRequestBody<VerifySecurityQuestionsRequest>, res: TypedResponse<{ valid: boolean }>) => {
        try {
            const { userId, answers } = req.body;
            const isValid = await accountRecoveryService.verifySecurityQuestions(userId, answers);
            res.json({ valid: isValid });
        } catch (error) {
            const incident: SecurityIncident = {
                type: 'AUTHENTICATION_FAILURE',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    action: 'verify_security_questions'
                },
                resolved: false
            };
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(500).json({
                error: 'Failed to verify security questions'
            });
        }
    });
    // CSP violation reporting endpoint
    app.post('/api/security/csp-report', 
        express.json({ type: 'application/csp-report' }), 
        async (req: Request, res: Response) => {
            const incident: SecurityIncident = {
                type: 'CSP_VIOLATION',
                severity: 'MEDIUM',
                timestamp: new Date(),
                sourceIp: req.ip,
                details: req.body,
                resolved: false
            };
            await securityHeadersService.reportViolation(req);
            await securityIncidentService.handleIncident(incident);
            await notificationService.notifyIncident(incident);
            res.status(204).end();
    });
    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        const incident: SecurityIncident = {
            type: 'UNAUTHORIZED_ACCESS',
            severity: 'HIGH',
            timestamp: new Date(),
            sourceIp: req.ip,
            details: {
                error: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method
            },
            resolved: false
        };

        securityAuditService.recordAlert('APP_ERROR', 'HIGH', {
            error: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            ip: req.ip
        });

        // Check if it's a security-related error
        if (err.message.includes('security') || err.message.includes('auth')) {
            securityIncidentService.handleIncident(incident);
            notificationService.notifyIncident(incident);
        }

        res.status(500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal Server Error'
                : err.message
        });
    });
    return app;
}
if (require.main === module) {
    const port = process.env.PORT || 3000;
    createApp().then((app: Express) => {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    });
}
