// upload.routes.js
import express from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.config.js'; 
import { getAllUploads, getUploadById, handleFileUpload } from '../controllers/fileUploadController.js';

const uploadRouter = express.Router();
const upload = multer({ storage });

uploadRouter.post('/upload', upload.array('files', 10), handleFileUpload);

uploadRouter.get('/uploads', getAllUploads);
uploadRouter.get('/uploads/:id', getUploadById);

export default uploadRouter;
































































