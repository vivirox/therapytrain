import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from "../../tsconfig";
export interface CustomRequest extends Request {
    user?: {
        id: string;
        app_metadata: any;
        user_metadata: any;
        aud: string;
        created_at: string;
    };
}
export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}
export const authMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new AuthenticationError('No authorization header');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new AuthenticationError('No token provided');
        }
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET) as {
                id: string;
                app_metadata: any;
                user_metadata: any;
                aud: string;
                created_at: string;
            };
            req.user = {
                id: decoded.id,
                app_metadata: decoded.app_metadata || {},
                user_metadata: decoded.user_metadata || {},
                aud: decoded.aud,
                created_at: decoded.created_at
            };
            next();
        }
        catch (error) {
            throw new AuthenticationError('Invalid token');
        }
    }
    catch (error) {
        if (error instanceof AuthenticationError) {
            res.status(401).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
