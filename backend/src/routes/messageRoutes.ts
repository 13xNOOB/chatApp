import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authCheck } from '../middleware/authCheck';

const router = Router();

router.get('/:userId', authCheck, messageController.getHistory);

export default router;
