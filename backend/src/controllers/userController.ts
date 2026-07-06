import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../middleware/authCheck';

export const userController = {
    async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const currentUserId = req.user!.id;
            const users = await userService.getUsersExcept(currentUserId);
            
            res.json({
                success: true,
                data: {
                    users
                }
            });
        } catch (err) {
            next(err);
        }
    }
};
