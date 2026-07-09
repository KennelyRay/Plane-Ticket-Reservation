import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, denyRoles } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, denyRoles('ADMIN'), paymentController.pay);

export default router;
