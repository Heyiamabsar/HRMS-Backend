
import mongoose from 'mongoose';
import UserModel from "../models/userModel.js";
import UploadModel from '../models/fileUploadModel.js';


export const handleFileUpload = async (req, res) => {
  try {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'No files uploaded', error: 'No files uploaded' });
    }

    const files = req.files.map((file) => ({
        _id: new mongoose.Types.ObjectId(),
      filename: file.originalname,
      url: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }));
    

    const newUpload = new UploadModel({
      title: req.body.title || 'Untitled',
      files,
      user: req.body.userId ? req.body.userId : null,
    });

    const savedUpload = await newUpload.save();

    await UserModel.findByIdAndUpdate(req.body.userId, {
      $push: { uploads: savedUpload },
    });

    const populatedUpload = await UploadModel.findById(savedUpload._id).populate('user');

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `${req.files.length} Files uploaded successfully`,
      count: req.files.length,
      title: req.body.title,
      files,
      user: populatedUpload.user
    });
  } catch (error) {
    res.status(500).json({ success: false, statusCode: 500,message:'Server error', error: 'Server error' });
  }
};

export const getAllUploads = async (req, res) => {
  try {
    const uploads = await UploadModel.find().populate('user');
    res.status(200).json({ success: true, statusCode: 200, message: "Uploads fetched successfully", uploads });
  } catch (error) {
    res.status(500).json({ success: false, statusCode: 500, message: 'Server error', error: 'Server error' });
  }
};


export const getUploadById = async (req, res) => {
  const { id } = req.params;
console.log("Get Upload ID:", id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, statusCode: 400, error: 'Invalid ID format' });
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
      message: 'Upload fetched successfully',
      user: upload.userId
    });
  } catch (error) {
    console.error("Get Upload Error:", error);
    res.status(500).json({ success: false, statusCode: 500, message: 'Server error', error: 'Server error' });
  }
};
export const deleteUpload = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, statusCode: 400, message:"Invalid ID format", error: 'Invalid ID format' });
  }

  try {
    const upload = await UploadModel.findByIdAndDelete(id);
    if (!upload) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'Upload not found', error: 'Upload not found' });
    }

    res.status(200).json({ success: true, statusCode: 200, message: 'Upload deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, statusCode: 500, message: 'Server error', error: 'Server error' });
  }
};