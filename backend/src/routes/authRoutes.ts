import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authCheck } from '../middleware/authCheck';

const router = Router();

router.use(authRateLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authCheck, authController.logout);

export default router;
