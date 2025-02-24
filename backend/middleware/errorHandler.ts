import { Request, Response, NextFunction } from "express";
const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`Error: ${error.message}`, {
        stack: error.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({
        message: 'Internal server error',
        requestId: (req as any).id // Type assertion to bypass TypeScript error
    });
};
export default errorHandler;
