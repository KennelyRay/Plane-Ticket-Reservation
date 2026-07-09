import { Router } from 'express';
import { seatController } from '../controllers/seat.controller';
import { authenticate, denyRoles, optionalAuth } from '../middleware/auth';

const router = Router();

// Seat map is public; locking/releasing is part of the customer booking flow.
router.get('/flight/:flightId', optionalAuth, seatController.getSeatMap);
router.post('/lock', authenticate, denyRoles('ADMIN'), seatController.lock);
router.post('/release', authenticate, denyRoles('ADMIN'), seatController.release);

export default router;
