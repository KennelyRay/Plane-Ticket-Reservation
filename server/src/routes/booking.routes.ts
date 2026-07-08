import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', bookingController.create);
router.get('/', bookingController.listMine);
router.get('/:id', bookingController.getById);
router.post('/:id/cancel', bookingController.cancel);

export default router;
