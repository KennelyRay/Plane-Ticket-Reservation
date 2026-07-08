import { Router } from 'express';
import authRoutes from './auth.routes';
import flightRoutes from './flight.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/flights', flightRoutes);

// Future modules mount here:
// router.use('/users', userRoutes);
// router.use('/passengers', passengerRoutes);
// router.use('/airlines', airlineRoutes);
// router.use('/airports', airportRoutes);
// router.use('/aircrafts', aircraftRoutes);
// router.use('/seats', seatRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/tickets', ticketRoutes);
// router.use('/checkin', checkinRoutes);
// router.use('/reports', reportRoutes);
// router.use('/admin', adminRoutes);

export default router;
