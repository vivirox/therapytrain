import { Request, Response, NextFunction } from 'express';
import { logger } from "@/utils/logger";
import { PostgrestError } from '@supabase/supabase-js';
export interface AppError extends Error {
    status?: number;
    code?: string;
}
export const errorHandler = (err: Error | AppError | PostgrestError, req: Request, res: Response, next: NextFunction) => {
    logger.error('Error:', err);
    // Handle Supabase errors
    if ('code' in err && 'details' in err && 'hint' in err && 'message' in err) {
        const pgError = err as PostgrestError;
        return res.status(400).json({
            error: 'Database Error',
            message: pgError.message,
            details: pgError.details
        });
    }
    // Handle known application errors
    if ('status' in err) {
        return res.status(err.status || 500).json({
            error: err.message
        });
    }
    // Handle validation errors
    if (err.message.includes('validation failed')) {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message
        });
    }
    // Default error
    return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
};
