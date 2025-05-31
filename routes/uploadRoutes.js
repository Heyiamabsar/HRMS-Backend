// upload.routes.js
import express from 'express';
import multer from 'multer';
import { storage } from '../config/cloudinary.config.js'; 
import { deleteUpload, getAllUploads, getUploadById, handleFileUpload } from '../controllers/uploadController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';


const uploadRouter = express.Router();
const upload = multer({ storage });

uploadRouter.use(authenticate);
uploadRouter.post('/upload', authorizeRoles('admin', 'hr', 'employee'), upload.array('files', 10), handleFileUpload);
uploadRouter.delete('/uploads/:id', authorizeRoles('admin', 'hr', 'employee'), deleteUpload);

// For Admin and HR
uploadRouter.get('/uploads/:id', authorizeRoles('admin', 'hr'), getUploadById);
uploadRouter.get('/uploads', authorizeRoles('admin', 'hr'), getAllUploads);

export default uploadRouter;