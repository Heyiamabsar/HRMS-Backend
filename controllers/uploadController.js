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


// controllers/userController.js
export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user._id; // login user
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Cloudinary response se url nikal lo
    const imageUrl = req.file.path; // multer-storage-cloudinary already deta hai

    // User ke profileImageUrl ko update karo
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { profileImageUrl: imageUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      profileImageUrl: updatedUser.profileImageUrl,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to upload profile image", error: error.message });
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
// console.log("Get Upload ID:", id);

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

export const getUserUploads = async (req, res) => {
  try {
    const userId = req.params.id;
console.log("userId",userId)
    // Step 1: Get user and check
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Step 2: Get uploads using document IDs
    const uploadDetails = await UploadModel.find({
      _id: { $in: user.uploads }
    });

    return res.status(200).json({
      success: true,
      count: uploadDetails.length,
      uploads: uploadDetails
    });

  } catch (error) {
    console.error("[getUserUploads]", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


export const updateUploadById = async (req, res) => {
  try {
    const uploadId = req.params.id;
    const { title } = req.body;
    console.log("Files to update:", req.files);
    const loginUser = await userModel.findById(req.user._id);

    const upload = await UploadModel.findById(uploadId);
    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    // ✅ Update title
    if (title) {
      upload.title = title;
    }

    // ✅ Append files if present
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        _id: new mongoose.Types.ObjectId(),
        filename: file.originalname,
        url: file.path,
        mimetype: file.mimetype,
        size: file.size,
      }));

      upload.files = newFiles;
    }

    // ✅ Save updated document
    const updated = await upload.save();

    res.status(200).json({
      success: true,
      message: "Upload updated successfully",
      upload: updated,
      user: loginUser._id,
    });

  } catch (error) {
    console.error("❌ [updateUploadById]", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

