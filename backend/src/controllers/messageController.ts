import { Response, NextFunction } from 'express';
import { messageService } from '../services/messageService';
import { AuthenticatedRequest } from '../middleware/authCheck';

export const messageController = {
    async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const loggedInUserId = req.user!.id;
            const targetUserId = parseInt(req.params.userId, 10);
            const cursorParam = req.query.cursor;
            const limitParam = req.query.limit;

            if (isNaN(targetUserId)) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid userId parameter' } });
            }

            const cursor = cursorParam ? parseInt(cursorParam as string, 10) : undefined;
            const limit = limitParam ? parseInt(limitParam as string, 10) : 20;

            const result = await messageService.getHistory(loggedInUserId, targetUserId, cursor, limit);
            
            res.json({
                success: true,
                data: result
            });
        } catch (err) {
            next(err);
        }
    }
};
