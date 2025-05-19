// upload.routes.js
import express from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.config.js'; 
import { deleteUpload, getAllUploads, getUploadById, handleFileUpload } from '../controllers/uploadController.js';


const uploadRouter = express.Router();
const upload = multer({ storage });

uploadRouter.post('/upload', upload.array('files', 10), handleFileUpload);
uploadRouter.get('/uploads', getAllUploads);
uploadRouter.get('/uploads/:id', getUploadById);
uploadRouter.delete('/uploads/:id', deleteUpload);

export default uploadRouter;