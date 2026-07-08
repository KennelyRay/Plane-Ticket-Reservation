import { Router } from 'express';
import authRoutes from './auth.routes';
import flightRoutes from './flight.routes';
import seatRoutes from './seat.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/flights', flightRoutes);
router.use('/seats', seatRoutes);
router.use('/admin', adminRoutes);

// Future modules mount here:
// router.use('/users', userRoutes);
// router.use('/passengers', passengerRoutes);
// router.use('/airlines', airlineRoutes);
// router.use('/airports', airportRoutes);
// router.use('/aircrafts', aircraftRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/tickets', ticketRoutes);
// router.use('/checkin', checkinRoutes);
// router.use('/reports', reportRoutes);

export default router;
