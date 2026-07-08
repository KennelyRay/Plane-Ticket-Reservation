import { Router } from 'express';
import { airportController } from '../controllers/airport.controller';

const router = Router();

router.get('/', airportController.list);
router.get('/routes', airportController.routes);

export default router;
