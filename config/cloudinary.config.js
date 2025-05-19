// cloudinary.config.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Dynamic storage based on file type
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let resourceType = 'image'; // default

    const fileType = file.mimetype;
    if (fileType.startsWith('video/')) resourceType = 'video';
    else if (
      fileType === 'application/pdf' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ) resourceType = 'raw';

    return {
      folder: 'uploads',
      resource_type: resourceType,
      allowed_formats: ['jpg', 'png', 'mp4', 'pdf', 'docx'],
    };
  },
});

export { cloudinary, storage };
