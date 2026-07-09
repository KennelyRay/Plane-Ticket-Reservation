import { Router } from 'express';
import { checkinController } from '../controllers/checkin.controller';
import { authenticate, denyRoles } from '../middleware/auth';

const router = Router();

router.post('/:bookingId', authenticate, denyRoles('ADMIN'), checkinController.checkIn);

export default router;
