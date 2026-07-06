import { Response, NextFunction } from 'express';
import { messageService } from '../services/messageService';
import { AuthenticatedRequest } from '../middleware/authCheck';

export const messageController = {
    async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const cursorParam = req.query.cursor;
            const limitParam = req.query.limit;

            const cursor = cursorParam ? parseInt(cursorParam as string, 10) : undefined;
            const limit = limitParam ? parseInt(limitParam as string, 10) : 20;

            const result = await messageService.getHistory(userId, cursor, limit);
            
            res.json({
                success: true,
                data: result
            });
        } catch (err) {
            next(err);
        }
    }
};
