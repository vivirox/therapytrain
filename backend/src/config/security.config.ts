import { SecurityHeadersConfig } from "../security/SecurityHeadersService";
export const securityConfig: Partial<SecurityHeadersConfig> = {
    enableHSTS: process.env.NODE_ENV === 'production',
    enableCSP: true,
    enableFPS: true,
    enableReferrerPolicy: true,
    hstsMaxAge: 31536000, // 1 year
    cspDirectives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "'strict-dynamic'",
            // Add trusted CDNs or external scripts here
            process.env.EXTERNAL_SCRIPTS_DOMAIN,
        ].filter(Boolean) as string[],
        styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for styled-components
            // Add trusted style sources here
            process.env.EXTERNAL_STYLES_DOMAIN,
        ].filter(Boolean) as string[],
        imgSrc: [
            "'self'",
            'data:',
            'https:',
            // Add trusted image sources here
            process.env.EXTERNAL_IMAGES_DOMAIN,
        ].filter(Boolean) as string[],
        connectSrc: [
            "'self'",
            process.env.API_DOMAIN,
            process.env.WS_DOMAIN,
            // Add API and WebSocket domains here
        ].filter(Boolean) as string[],
        fontSrc: [
            "'self'",
            'https:',
            'data:',
            // Add trusted font sources here
            process.env.EXTERNAL_FONTS_DOMAIN,
        ].filter(Boolean) as string[],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        formAction: ["'self'"],
        sandboxDirectives: [
            'allow-scripts',
            'allow-same-origin',
            'allow-forms',
            'allow-popups'
        ],
        reportUri: '/api/security/csp-report'
    }
};
export const webAuthnConfig = {
    rpName: 'TherapyTrain',
    rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
    challengeTimeout: 60000,
    attestation: 'direct' as const,
    authenticatorAttachment: 'platform' as const,
    cryptoParams: [-7, -257] // ECDSA with SHA-256, RSA-PSS with SHA-256
};
export const rateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req: any) => req.ip // Can be enhanced with user ID when authenticated
};
export const corsConfig = {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 600 // 10 minutes
};
export const helmetConfig = {
    contentSecurityPolicy: false, // We handle CSP separately
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    expectCt: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: false, // We handle HSTS separately
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: false, // We handle Referrer-Policy separately
    xssFilter: true
};
