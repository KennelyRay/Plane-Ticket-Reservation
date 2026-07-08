import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Everything under /admin requires an authenticated ADMIN
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', adminController.stats);

router.get('/flights', adminController.listFlights);
router.post('/flights/:id/delay', adminController.delayFlight);
router.post('/flights/:id/cancel', adminController.cancelFlight);
router.post('/flights/:id/reinstate', adminController.reinstateFlight);

router.get('/users', adminController.listUsers);
router.patch('/users/:id', adminController.updateUser);

export default router;
