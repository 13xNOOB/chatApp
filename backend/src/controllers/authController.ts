import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, password, timezone } = req.body;
            
            if (!name || !email || !password || !timezone) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Name, email, password, and timezone are required'
                    }
                });
            }

            // Simple IANA timezone validation check
            try {
                Intl.DateTimeFormat(undefined, { timeZone: timezone });
            } catch (err) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid IANA timezone'
                    }
                });
            }

            const user = await authService.register(name, email, password, timezone);
            
            res.status(201).json({
                success: true,
                data: {
                    user
                }
            });
        } catch (err) {
            next(err);
        }
    },

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, deviceToken, platform } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Email and password are required'
                    }
                });
            }

            const { token, user } = await authService.login(email, password, deviceToken, platform);
            
            res.json({
                success: true,
                data: {
                    token,
                    user
                }
            });
        } catch (err) {
            next(err);
        }
    },

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { deviceToken } = req.body;
            await authService.logout(deviceToken);
            
            res.json({
                success: true,
                data: {
                    message: 'Logged out successfully'
                }
            });
        } catch (err) {
            next(err);
        }
    }
};
