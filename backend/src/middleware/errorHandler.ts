import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);
    
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : err.message
        }
    });
};
