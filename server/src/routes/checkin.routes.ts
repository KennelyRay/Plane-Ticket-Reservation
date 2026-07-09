import { Router } from 'express';
import { checkinController } from '../controllers/checkin.controller';
import { authenticate, denyRoles } from '../middleware/auth';

const router = Router();

router.post('/:bookingId', authenticate, denyRoles('ADMIN'), checkinController.checkIn);
router.post('/:bookingId/email', authenticate, denyRoles('ADMIN'), checkinController.emailBoardingPass);

export default router;
