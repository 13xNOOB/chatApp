import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authCheck } from '../middleware/authCheck';

const router = Router();

router.get('/', authCheck, userController.getUsers);

export default router;
