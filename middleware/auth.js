import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import userModel from '../models/User.js';
dotenv.config();

export const authenticate = async(req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access Denied');

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

export const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    try {

      console.log('User ID:', req.user);
      const user = await userModel.findById(req.user._id).select('role');
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: 'Server Error', error: err.message });
    }
  };
};
