import express from 'express';
import { register, login, refreshToken } from '../controllers/authController.js';
import { authenticate, authorizeRoles, isVerifiedPass } from '../middleware/auth.js';
const authRouter = express.Router();

authRouter.post('/register',authenticate, authorizeRoles('superAdmin','admin','hr'),register);
authRouter.post('/refreshToken',refreshToken);
// authRouter.post('/register',authenticate, authorizeRoles('admin'),register);
authRouter.post('/login',isVerifiedPass, login);


export default authRouter;
