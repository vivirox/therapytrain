import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { SecurityHeadersService } from './security/SecurityHeadersService';
import { SecurityAuditService } from './services/SecurityAuditService';
import { WebAuthnService } from './security/WebAuthnService';
import { SecurityIncidentService } from './security/SecurityIncidentService';
import {
    securityConfig,
    corsConfig,
    rateLimitConfig,
    helmetConfig
} from './config/security.config';

export async function createApp() {
    const app = express();
    const securityAuditService = new SecurityAuditService();
    const webAuthnService = new WebAuthnService(securityAuditService);
    const securityIncidentService = new SecurityIncidentService(
        securityAuditService,
        webAuthnService
    );
    const securityHeadersService = new SecurityHeadersService(
        securityAuditService,
        securityConfig
    );

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Security middleware
    app.use(helmet(helmetConfig));
    app.use(cors(corsConfig));

    // Custom rate limit middleware with incident tracking
    const rateLimitMiddleware = rateLimit({
        ...rateLimitConfig,
        handler: async (req, res) => {
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
    app.use((req, res, next) => {
        if (securityIncidentService.isIpBlocked(req.ip)) {
            return res.status(403).json({
                error: 'Access denied due to suspicious activity.'
            });
        }
        next();
    });

    // WebAuthn endpoints
    app.post('/api/auth/webauthn/register', async (req, res) => {
        try {
            const { userId, username, devices } = req.body;
            const options = await webAuthnService.generateRegistrationOptions(
                userId,
                username,
                devices
            );
            res.json(options);
        } catch (error) {
            await securityIncidentService.handleIncident({
                type: 'WEBAUTHN_VIOLATION',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    endpoint: '/register'
                }
            });
            res.status(400).json({
                error: 'Failed to generate registration options'
            });
        }
    });

    app.post('/api/auth/webauthn/verify', async (req, res) => {
        try {
            const { userId, username, verification } = req.body;
            const result = await webAuthnService.verifyRegistration(
                userId,
                username,
                verification
            );
            res.json(result);
        } catch (error) {
            await securityIncidentService.handleIncident({
                type: 'WEBAUTHN_VIOLATION',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                userId: req.body?.userId,
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    endpoint: '/verify'
                }
            });
            res.status(400).json({
                error: 'Failed to verify registration'
            });
        }
    });

    // CSP violation reporting endpoint
    app.post('/api/security/csp-report', express.json({
        type: 'application/csp-report'
    }), async (req, res) => {
        await securityHeadersService.reportViolation(req);
        await securityIncidentService.handleIncident({
            type: 'CSP_VIOLATION',
            severity: 'MEDIUM',
            timestamp: new Date(),
            sourceIp: req.ip,
            details: req.body
        });
        res.status(204).end();
    });

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        securityAuditService.recordAlert(
            'APP_ERROR',
            'HIGH',
            {
                error: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method,
                ip: req.ip
            }
        );

        // Check if it's a security-related error
        if (err.message.includes('security') || err.message.includes('auth')) {
            securityIncidentService.handleIncident({
                type: 'UNAUTHORIZED_ACCESS',
                severity: 'HIGH',
                timestamp: new Date(),
                sourceIp: req.ip,
                details: {
                    error: err.message,
                    url: req.url,
                    method: req.method
                }
            });
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
    createApp().then(app => {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    });
} 