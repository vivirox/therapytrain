import { Router } from 'express';
import { AuditController } from "@/controllers/audit.controller";
import { authMiddleware } from "@/middleware/auth";
import { rateLimit } from 'express-rate-limit';
const router = Router();
const auditController = new AuditController();
// Rate limiting specifically for audit endpoints
const auditRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many audit log requests from this IP, please try again later.'
});
// Apply rate limiting and authentication to all audit routes
router.use(auditRateLimiter);
router.use(authMiddleware);
// Get audit logs with filters
router.get('/logs', auditController.getAuditLogs.bind(auditController));
// Get security metrics
router.get('/metrics', auditController.getSecurityMetrics.bind(auditController));
// Get recent security alerts
router.get('/alerts', auditController.getSecurityAlerts.bind(auditController));
// Get rate limit events
router.get('/rate-limits', auditController.getRateLimitEvents.bind(auditController));
export default router;
