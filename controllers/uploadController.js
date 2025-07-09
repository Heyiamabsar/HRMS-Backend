import UploadModel from "../models/fileUploadModel.js";
import mongoose from 'mongoose';
import userModel from "../models/userModel.js";
import { sendNotification } from "../utils/notificationutils.js";



export const handleFileUpload = async (req, res) => {
  try {

    	const loginUserId=req.user._id
 	const loginUser = await userModel.findById(loginUserId);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({success: false, statusCode: 400, error: 'No files uploaded' });
    }

    const files = req.files.map((file) => ({
        _id: new mongoose.Types.ObjectId(),
      filename: file.originalname,
      url: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }));
    const user = req.user
  ? {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    }
  : null;

    const newUpload = new UploadModel({
      title: req.body.title || 'Untitled',
      files,
      user,
    });

    const savedUpload = await newUpload.save();

    await userModel.findByIdAndUpdate(req.user._id, {
      $push: { uploads: savedUpload },
    });

    const populatedUpload = await UploadModel.findById(savedUpload._id).populate({
      path: 'user',
      select: '_id name email role' 
    });

    await sendNotification({
      forRoles: ["admin", "hr"],
      title: "New Files Uploaded",
      message: `${loginUser.first_name} ${loginUser.last_name} uploaded ${req.files.length} file(s): "${newUpload.title}"`,
      // link: `/uploads/${savedUpload._id}`,
      type: "admin",
      performedBy: loginUser._id
    });

    res.status(200).json({
      _id: savedUpload._id,
      title: savedUpload.title,
      success: true,
      statusCode: 200,
      message: `${req.files.length} Files uploaded successfully`,
      count: req.files.length,
      title: req.body.title,
      files,
      user: populatedUpload.user
    });
  } catch (error) {
    res.status(500).json({ success: false, statusCode: 500, message: 'Server error', error: 'Server error' });
  }
};



export const getAllUploads = async (req, res) => {
  try {
    const uploads = await UploadModel.find().populate('user');
    res.status(200).json({
      success: true,
      statusCode: 200,
      uploads
    });
  } catch (error) {
    res.status(500).json({ success: false, statusCode: 500, error: 'Server error' });
  }
};


export const getUploadById = async (req, res) => {
  const { id } = req.params;
console.log("Get Upload ID:", id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({success: false, statusCode: 400, error: 'Invalid ID format' });
  }

  try {
    const upload = await UploadModel.findById(id).populate('userId');
    if (!upload) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Upload not found' });
    }

    res.status(200).json({
      ...upload.toObject(),
      success: true,
      statusCode: 200,
      user: upload.userId
    });
  } catch (error) {
    console.error("Get Upload Error:", error);
    res.status(500).json({ success: false, statusCode: 500, error: 'Server error' });
  }
};


export const deleteUpload = async (req, res) => {
  const { id } = req.params;

  	const loginUserId=req.user._id
 	const loginUser = await userModel.findById(loginUserId);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, statusCode: 400, error: 'Invalid ID format' });
  }

  try {
    const upload = await UploadModel.findByIdAndDelete(id);
    if (!upload) {
      return res.status(404).json({ success: false, statusCode: 404, error: 'Upload not found' });
    }

      await sendNotification({
      forRoles: ["admin", "hr"],
      title: "File Upload Deleted",
      message: `${loginUser.first_name} ${loginUser.last_name} deleted uploaded files titled "${upload.title}"`,
      // link: `/uploads`,
      type: "admin",
      performedBy: loginUser._id
    });

    res.status(200).json({ success: true, statusCode: 200, message: 'Upload deleted successfully' });
  } catch (error) {
    console.error("Delete Upload Error:", error);
    res.status(500).json({ success: false, statusCode: 500, error: 'Server error' });
  }
};
