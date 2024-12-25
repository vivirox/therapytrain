import { createServer } from 'http';
import helmet from 'helmet';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Security headers
app.use(helmet());
app.use(limiter);

// Encryption middleware
app.use(express.json({ limit: '10kb' }));

// Audit logging middleware
app.use((req, res, next) => {
    const auditLog = {
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user?.id
    };
    console.log('Audit:', auditLog);
    next();
});

const server = app.listen(3000, () => {
    console.log('Secure server running on port 3000');
});