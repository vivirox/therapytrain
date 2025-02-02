import { Request, Response, NextFunction } from 'express';

export interface CustomRequest extends Request {
  user?: {
    id: string;
  };
}

const authMiddleware = (req: CustomRequest, res: Response, next: NextFunction) => {
  // Simulate user authentication
  req.user = { id: '12345' }; // Example user ID
  next();
};

export default authMiddleware;
