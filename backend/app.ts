import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import educationRoutes from "./routes/education";
import chatRoutes from "./src/routes/chat";
import userRoutes from "./src/routes/user";
import { authMiddleware } from "./src/middleware/auth";
import { WebSocketServer } from "./src/services/websocket/WebSocketServer";
import { SessionManager } from "./src/services/websocket/SessionManager";
import { RateLimiterService } from "./src/services/RateLimiterService";
import { SecurityAuditService } from "./src/services/SecurityAuditService";
dotenv.config();
const app = express();
const server = createServer(app);
// Initialize services
const rateLimiter = new RateLimiterService();
const securityAudit = new SecurityAuditService();
const sessionManager = new SessionManager();
// Initialize WebSocket server
const wss = new WebSocketServer(server);
// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
// Rate limiting middleware
const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (rateLimiter.checkRateLimit(req.ip)) {
        next();
    }
    else {
        res.status(429).json({ error: 'Too many requests' });
    }
};
// Suspicious activity monitoring
const suspiciousActivityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const isRequestValid = await securityAudit.checkRequest(req);
    if (!isRequestValid) {
        res.status(403).json({ error: 'Invalid request' });
    }
    else {
        next();
    }
};
app.use(rateLimitMiddleware);
app.use(suspiciousActivityMiddleware);
// Routes
app.use('/api/education', authMiddleware, educationRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/user', authMiddleware, userRoutes);
// Session cleanup job
setInterval(() => {
    sessionManager.cleanupInactiveSessions(60) // Clean up sessions inactive for 60 minutes
        .catch(error => console.error('Session cleanup error:', error));
}, 15 * 60 * 1000); // Run every 15 minutes
// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    wss.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
