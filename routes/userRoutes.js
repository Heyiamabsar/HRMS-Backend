import express from 'express';
import { getDashboard } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();

router.get('/dashboard', authenticate, getDashboard);

export default router;
