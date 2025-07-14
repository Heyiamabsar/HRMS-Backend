import express from 'express';
import { register, login } from '../controllers/authController.js';
import { authenticate, authorizeRoles, isVerifiedPass } from '../middleware/auth.js';
const router = express.Router();

router.post('/register',authenticate, authorizeRoles('admin','hr'),register);
// router.post('/register',authenticate, authorizeRoles('admin'),register);
router.post('/login',isVerifiedPass, login);


export default router;
