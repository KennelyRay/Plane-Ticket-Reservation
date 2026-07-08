import { Router } from 'express';
import { seatController } from '../controllers/seat.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/flight/:flightId', optionalAuth, seatController.getSeatMap);
router.post('/lock', authenticate, seatController.lock);
router.post('/release', authenticate, seatController.release);

export default router;
