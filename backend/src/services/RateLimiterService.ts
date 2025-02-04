import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

export class RateLimiterService {
    private rateLimits: Map<string, { count: number; lastReset: number }> = new Map();
    private readonly DEFAULT_WINDOW_MS = 60000; // 1 minute
    private readonly DEFAULT_MAX_REQUESTS = 100;
    private suspiciousList: Set<string> = new Set();
    private blacklistedIPs: Set<string> = new Set();
    private temporaryBlocks: Map<string, { until: number }> = new Map();
    private customLimits: Map<string, number> = new Map();

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
        return this.checkRateLimit(limitKey, maxRequests, windowMs);
    }

    /**
     * Check if a rate limit has been exceeded
     * @param key - The key to check
     * @param maxRequests - Maximum number of requests allowed
     * @param windowMs - Time window in milliseconds
     * @returns boolean - true if rate limit is exceeded, false otherwise
     */
    checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
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
    handleSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip;
        
        if (!ip) {
            return res.status(400).json({ error: 'IP address not found' });
        }

        if (this.blacklistedIPs.has(ip)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const temporaryBlock = this.temporaryBlocks.get(ip);
        if (temporaryBlock && temporaryBlock.until > Date.now()) {
            return res.status(429).json({ 
                error: 'Too many requests',
                retryAfter: Math.ceil((temporaryBlock.until - Date.now()) / 1000)
            });
        }

        if (this.suspiciousList.has(ip)) {
            const customLimit = this.customLimits.get(ip) || this.DEFAULT_MAX_REQUESTS / 2;
            if (this.checkRateLimit(ip, customLimit, this.DEFAULT_WINDOW_MS)) {
                this.temporaryBlocks.set(ip, { until: Date.now() + this.DEFAULT_WINDOW_MS });
                return res.status(429).json({ error: 'Too many requests' });
            }
        }

        next();
    };

    addToSuspiciousList(ip: string): void {
        this.suspiciousList.add(ip);
    }

    removeFromSuspiciousList(ip: string): void {
        this.suspiciousList.delete(ip);
    }

    blacklistIP(ip: string): void {
        this.blacklistedIPs.add(ip);
    }

    unblacklistIP(ip: string): void {
        this.blacklistedIPs.delete(ip);
    }

    setCustomLimit(ip: string, limit: number): void {
        this.customLimits.set(ip, limit);
    }

    /**
     * Temporarily block an IP address for a specified duration
     * @param ip - The IP address to block
     * @param duration - Duration in seconds for the block
     */
    temporaryBlock(ip: string, duration: number): void {
        this.temporaryBlocks.set(ip, { until: Date.now() + (duration * 1000) });
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
    decreaseLimit(ip: string, decreaseBy?: number): void {
        const currentLimit = this.customLimits.get(ip) || this.DEFAULT_MAX_REQUESTS;
        const newLimit = decreaseBy ? currentLimit - decreaseBy : Math.floor(currentLimit / 2);
        this.setCustomLimit(ip, Math.max(1, newLimit)); // Ensure limit doesn't go below 1
    }

    private handleRateLimit(req: Request, res: Response, next: NextFunction) {
        return res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
    }
}
