import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { setupSessionRoutes } from "./routes";
import { supabaseAuthMiddleware } from "./middleware/supabaseAuth";
import auditRoutes from "./routes/audit.routes";
const app = express();
// Middleware
app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Rate limiting
const limiter: RequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Routes
app.get('/health', (req: unknown, res: unknown) => {
    res.json({ status: 'ok' });
});
// Protected routes
app.use('/api/sessions', supabaseAuthMiddleware, setupSessionRoutes());
app.use('/api/audit', auditRoutes); // Audit routes already include auth middleware
// Error handling must be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    errorHandler(err, req, res, next);
});
// Start server
const port = config.port || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
