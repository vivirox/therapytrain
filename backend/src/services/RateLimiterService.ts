import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { SecurityAuditService } from './SecurityAuditService';

export class RateLimiterService {
    private rateLimits: Map<string, { count: number; lastReset: number }> = new Map();
    private readonly DEFAULT_WINDOW_MS = 60000; // 1 minute
    private readonly DEFAULT_MAX_REQUESTS = 100;
    private suspiciousList: Set<string> = new Set();
    private blacklistedIPs: Set<string> = new Set();
    private temporaryBlocks: Map<string, { until: number }> = new Map();
    private customLimits: Map<string, number> = new Map();
    private securityAudit: SecurityAuditService;

    constructor() {
        this.securityAudit = SecurityAuditService.getInstance();
    }

    /**
     * Creates an Express middleware for rate limiting
     * @param maxRequests - Maximum number of requests allowed in the time window
     * @param windowMs - Time window in milliseconds
     * @returns Express middleware function
     */
    createRateLimiter(maxRequests: number = this.DEFAULT_MAX_REQUESTS, windowMs: number = this.DEFAULT_WINDOW_MS) {
        return rateLimit({
            windowMs: this.DEFAULT_WINDOW_MS,
            max: this.DEFAULT_MAX_REQUESTS,
            keyGenerator: (req: Request) => req.ip || 'unknown',
            skip: (req: Request) => req.ip ? this.isWhitelisted(req.ip) : false,
            handler: this.handleRateLimit.bind(this)
        });
    }

    /**
     * Check if a given key has exceeded its rate limit
     * @param key - Unique identifier (e.g., IP address, user ID)
     * @param type - Optional type of rate limit to check (e.g., 'message', 'connection')
     * @param maxRequests - Maximum number of requests allowed in the time window
     * @param windowMs - Time window in milliseconds
     * @returns boolean - true if rate limit is exceeded, false otherwise
     */
    isRateLimited(
        key: string,
        type?: string,
        maxRequests: number = this.DEFAULT_MAX_REQUESTS,
        windowMs: number = this.DEFAULT_WINDOW_MS
    ): boolean {
        const limitKey = type ? `${key}:${type}` : key;
        const isLimited = this.checkRateLimit(limitKey, maxRequests, windowMs);

        if (isLimited) {
            this.securityAudit.logRateLimitEvent(key, type || 'default', {
                maxRequests,
                windowMs,
                status: 'exceeded'
            });
        }

        return isLimited;
    }

    /**
     * Check if a rate limit has been exceeded
     * @param key - The key to check
     * @param maxRequests - Maximum number of requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns boolean - true if rate limit is exceeded, false otherwise
     */
    private checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
        const now = Date.now();
        const limit = this.rateLimits.get(key);

        if (!limit) {
            this.rateLimits.set(key, { count: 1, lastReset: now });
            return false;
        }

        if (now - limit.lastReset >= windowMs) {
            this.rateLimits.set(key, { count: 1, lastReset: now });
            return false;
        }

        limit.count++;
        return limit.count > maxRequests;
    }

    /**
     * Middleware to handle suspicious activity
     */
    handleSuspiciousActivity = async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip;

        if (!ip) {
            return res.status(400).json({ error: 'IP address not found' });
        }

        if (this.blacklistedIPs.has(ip)) {
            await this.securityAudit.recordAlert('BLACKLISTED_IP_ACCESS', 'HIGH', {
                ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
            return res.status(403).json({ error: 'Access denied' });
        }

        const temporaryBlock = this.temporaryBlocks.get(ip);
        if (temporaryBlock && temporaryBlock.until > Date.now()) {
            await this.securityAudit.logRateLimitEvent(ip, 'temporary_block', {
                until: temporaryBlock.until,
                status: 'blocked'
            });
            return res.status(429).json({
                error: 'Too many requests',
                retryAfter: Math.ceil((temporaryBlock.until - Date.now()) / 1000)
            });
        }

        if (this.suspiciousList.has(ip)) {
            const customLimit = this.customLimits.get(ip) || this.DEFAULT_MAX_REQUESTS / 2;
            if (this.checkRateLimit(ip, customLimit, this.DEFAULT_WINDOW_MS)) {
                this.temporaryBlocks.set(ip, { until: Date.now() + this.DEFAULT_WINDOW_MS });
                await this.securityAudit.recordAlert('SUSPICIOUS_IP_BLOCKED', 'MEDIUM', {
                    ip,
                    userAgent: req.headers['user-agent'],
                    path: req.path,
                    customLimit,
                    blockDuration: this.DEFAULT_WINDOW_MS
                });
                return res.status(429).json({ error: 'Too many requests' });
            }
        }

        next();
    }

    async addToSuspiciousList(ip: string): Promise<void> {
        this.suspiciousList.add(ip);
        await this.securityAudit.recordAlert('IP_MARKED_SUSPICIOUS', 'MEDIUM', {
            ip,
            timestamp: new Date().toISOString()
        });
    }

    async removeFromSuspiciousList(ip: string): Promise<void> {
        this.suspiciousList.delete(ip);
        await this.securityAudit.recordEvent('SUSPICIOUS_IP_REMOVED', {
            ip,
            timestamp: new Date().toISOString()
        });
    }

    async blacklistIP(ip: string): Promise<void> {
        this.blacklistedIPs.add(ip);
        await this.securityAudit.recordAlert('IP_BLACKLISTED', 'HIGH', {
            ip,
            timestamp: new Date().toISOString()
        });
    }

    async unblacklistIP(ip: string): Promise<void> {
        this.blacklistedIPs.delete(ip);
        await this.securityAudit.recordEvent('IP_UNBLACKLISTED', {
            ip,
            timestamp: new Date().toISOString()
        });
    }

    async setCustomLimit(ip: string, limit: number): Promise<void> {
        this.customLimits.set(ip, limit);
        await this.securityAudit.recordEvent('CUSTOM_RATE_LIMIT_SET', {
            ip,
            limit,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Temporarily block an IP address for a specified duration
     * @param ip - The IP address to block
     * @param duration - Duration in seconds for the block
     */
    async temporaryBlock(ip: string, duration: number): Promise<void> {
        const until = Date.now() + (duration * 1000);
        this.temporaryBlocks.set(ip, { until });
        await this.securityAudit.recordAlert('IP_TEMPORARILY_BLOCKED', 'MEDIUM', {
            ip,
            duration,
            until: new Date(until).toISOString(),
            timestamp: new Date().toISOString()
        });
    }

    private isWhitelisted(ip: string): boolean {
        // Add your whitelist logic here
        return false;
    }

    /**
     * Decrease the rate limit for a specific IP address
     * @param ip - The IP address to decrease limit for
     * @param decreaseBy - Amount to decrease the limit by (default: 50%)
     */
    async decreaseLimit(ip: string, decreaseBy?: number): Promise<void> {
        const currentLimit = this.customLimits.get(ip) || this.DEFAULT_MAX_REQUESTS;
        const newLimit = decreaseBy ? currentLimit - decreaseBy : Math.floor(currentLimit / 2);
        const finalLimit = Math.max(1, newLimit);

        await this.setCustomLimit(ip, finalLimit);
        await this.securityAudit.recordEvent('RATE_LIMIT_DECREASED', {
            ip,
            previousLimit: currentLimit,
            newLimit: finalLimit,
            decreaseBy: decreaseBy || '50%',
            timestamp: new Date().toISOString()
        });
    }

    private async handleRateLimit(req: Request, res: Response, next: NextFunction) {
        const ip = req.ip || 'unknown';
        await this.securityAudit.logRateLimitEvent(ip, 'global', {
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
            status: 'exceeded'
        });
        return res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
    }
}
