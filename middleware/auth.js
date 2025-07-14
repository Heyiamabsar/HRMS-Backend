import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
dotenv.config();

export const authenticate = async(req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({
    success: false,
    statusCode: 401,
    message: 'Access denied. No token provided.'
  });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Invalid Token'
    });
  }
};

export const authorizeRoles = (...roles) => {

  return async (req, res, next) => {
    try {
       console.log("!req?.user",!req?.user)
       console.log("!req?.user?._id",!req?.user?._id)
       
      if (!req?.user || !req?.user?._id) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: 'Unauthorized: User not authenticated',
        });
      }

      const user = await userModel.findById(req.user._id).select('role');
      if (!user) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: 'User not found',
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: 'Access denied',
        });
      }

      next();
    } catch (err) {
      res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'Server Error',
        error: err.message,
      });
    }
  };
};



export const isVerifiedPass = async (req, res, next) => {

      const { email, password } = req.body;
        const user = await userModel.findOne({ email })

   if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: 'Invalid credentials'
      });
    }


next()

}
