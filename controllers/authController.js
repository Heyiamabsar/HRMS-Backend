import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import requestIp from 'request-ip';
import geoip from 'geoip-lite';
import userModel from '../models/userModel.js';
import { sendNotification } from '../utils/notificationutils.js';
dotenv.config();

// testController

export const register = async (req, res) => {
  try {

    const { email, } = req.body;
    const userId=req.user._id
    console.log(userId)
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success : false,  statusCode: 400,message:"Email already exists", error: "Email already exists" });
    }
  
    
    const user = await userModel.create(req.body);
    const loginUser = await userModel.findById(userId);
    const userObj = user.toObject();
    delete userObj.password;

        await sendNotification({
      forRoles: ["admin", "hr"], 
      title: "New Employee Joined",
      message: `${loginUser.first_name} ${loginUser.last_name}  added a new employee: ${user.first_name} ${user.last_name}`,
      link: `/employee/${user._id}/profile`,
      type: "admin",
      performedBy: loginUser._id
    });

    res.status(201).json({success : true,  statusCode: 201,
      message: 'Users Created successfully', user: userObj});
  } catch (err) {
    res.status(400).json({success : false,  statusCode: 400, message: 'Failed to create user', error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'User not found' });
    }
    // Generate JWT token
    const token = jwt.sign({ _id: user._id, role: user.role}, process.env.JWT_SECRET,{ expiresIn: '9h' }) ;

      const ip = requestIp.getClientIp(req);
      const geo =geoip.lookup(ip && ip !== '::1' ? ip : '49.37.210.1');
      const loginTime = new Date();
      const timezone = geo?.timezone || 'Timezone not found';

      user.timeZone= timezone;
      user.lastLogin = loginTime;

      await user.save();

    res.json({
      success : true,  
      statusCode: 200,
      message: 'Login successful',
       token,
       user,
       });
  } catch (err) {
    res.status(400).json({success : false,  statusCode: 400, error: err.message });
  }
};
