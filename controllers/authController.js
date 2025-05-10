import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import userModel from '../models/User.js';
dotenv.config();

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    
    const user = await userModel.create({ name, email, password, role });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email} = req.body;
    const user = await userModel.findOne({ email }).select('-password');
  
   
    // Generate JWT token
    const token = jwt.sign({ _id: user._id, role: user.role}, process.env.JWT_SECRET,{ expiresIn: '9h' }) ;
    res.json({
       token,
       user,
       });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
