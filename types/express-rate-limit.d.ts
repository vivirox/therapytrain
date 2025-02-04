declare module 'express-rate-limit' {
  import { Request, Response, NextFunction } from 'express';

  interface Options {
    windowMs?: number;
    max?: number;
    message?: string;
    statusCode?: number;
    handler?: (req: Request, res: Response, next: NextFunction) => void;
    skip?: (req: Request, res: Response) => boolean;
    keyGenerator?: (req: Request) => string;
  }

  interface RateLimit {
    (options?: Options): (req: Request, res: Response, next: NextFunction) => void;
  }

  const rateLimit: RateLimit;
  export = rateLimit;
}
