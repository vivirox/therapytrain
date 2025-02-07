import { SecurityAuditService } from "../services/SecurityAuditService";
import { Request, Response, NextFunction } from 'express';
interface SecurityHeadersConfig {
    enableHSTS: boolean;
    enableCSP: boolean;
    enableFPS: boolean;
    enableReferrerPolicy: boolean;
    hstsMaxAge: number;
    cspDirectives: {
        defaultSrc: string[];
        scriptSrc: string[];
        styleSrc: string[];
        imgSrc: string[];
        connectSrc: string[];
        fontSrc: string[];
        objectSrc: string[];
        mediaSrc: string[];
        frameSrc: string[];
    };
}
export class SecurityHeadersService {
    private readonly config: SecurityHeadersConfig;
    private readonly securityAuditService: SecurityAuditService;
    private nonces: Map<string, Set<string>> = new Map();
    constructor(securityAuditService: SecurityAuditService, config: Partial<SecurityHeadersConfig> = {}) {
        this.securityAuditService = securityAuditService;
        this.config = {
            enableHSTS: true,
            enableCSP: true,
            enableFPS: true,
            enableReferrerPolicy: true,
            hstsMaxAge: 31536000, // 1 year
            cspDirectives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'strict-dynamic'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'https:', 'data:'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                ...config.cspDirectives
            },
            ...config
        };
    }
    private generateNonce(): string {
        return require('crypto').randomBytes(16).toString('base64');
    }
    private cleanupNonces(sessionId: string): void {
        const nonces = this.nonces.get(sessionId);
        if (nonces) {
            // Keep only the last 10 nonces
            const noncesArray = Array.from(nonces);
            if (noncesArray.length > 10) {
                this.nonces.set(sessionId, new Set(noncesArray.slice(-10)));
            }
        }
    }
    public addNonce(sessionId: string, nonce: string): void {
        if (!this.nonces.has(sessionId)) {
            this.nonces.set(sessionId, new Set());
        }
        this.nonces.get(sessionId)!.add(nonce);
        this.cleanupNonces(sessionId);
    }
    public validateNonce(sessionId: string, nonce: string): boolean {
        const sessionNonces = this.nonces.get(sessionId);
        if (!sessionNonces)
            return false;
        return sessionNonces.has(nonce);
    }
    private async logHeaderViolation(req: Request, headerName: string, violation: string): Promise<void> {
        await this.securityAuditService.recordAlert('SECURITY_HEADER_VIOLATION', 'HIGH', {
            headerName,
            violation,
            url: req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
    }
    public middleware() {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Generate nonce for this request
                const nonce = this.generateNonce();
                this.addNonce(req.sessionID || 'default', nonce);
                // Strict-Transport-Security
                if (this.config.enableHSTS) {
                    res.setHeader('Strict-Transport-Security', `max-age=${this.config.hstsMaxAge}; includeSubDomains; preload`);
                }
                // Content-Security-Policy
                if (this.config.enableCSP) {
                    const cspDirectives = this.buildCSPDirectives(nonce);
                    res.setHeader('Content-Security-Policy', cspDirectives);
                }
                // Feature-Policy / Permissions-Policy
                if (this.config.enableFPS) {
                    res.setHeader('Permissions-Policy', 'geolocation=self microphone=self camera=self');
                }
                // Other Security Headers
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('X-XSS-Protection', '1; mode=block');
                if (this.config.enableReferrerPolicy) {
                    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
                }
                // Report violations
                res.on('finish', () => {
                    const csp = res.getHeader('content-security-policy');
                    if (!csp) {
                        this.logHeaderViolation(req, 'CSP', 'Header missing');
                    }
                });
                next();
            }
            catch (error) {
                await this.securityAuditService.recordAlert('SECURITY_HEADERS_ERROR', 'HIGH', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    url: req.url,
                    ip: req.ip
                });
                next(error);
            }
        };
    }
    private buildCSPDirectives(nonce: string): string {
        const { cspDirectives } = this.config;
        return Object.entries(cspDirectives)
            .map(([key, values]) => {
            // Add nonce to script-src and style-src
            if (key === 'scriptSrc' || key === 'styleSrc') {
                values = [...values, `'nonce-${nonce}'`];
            }
            const directive = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            return `${directive} ${values.join(' ')}`;
        })
            .join('; ');
    }
    public async reportViolation(req: Request): Promise<void> {
        const report = req.body;
        await this.securityAuditService.recordAlert('CSP_VIOLATION', 'HIGH', {
            ...report,
            url: req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
    }
}
