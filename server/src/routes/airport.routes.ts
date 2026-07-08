import { Router } from 'express';
import { airportController } from '../controllers/airport.controller';

const router = Router();

router.get('/', airportController.list);

export default router;
