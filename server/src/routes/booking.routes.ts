import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate, denyRoles } from '../middleware/auth';

const router = Router();

// Bookings are a customer module — admins manage flights via /admin instead.
router.use(authenticate, denyRoles('ADMIN'));

router.post('/', bookingController.create);
router.get('/', bookingController.listMine);
router.get('/:id', bookingController.getById);
router.post('/:id/cancel', bookingController.cancel);

export default router;
