// cloudinary.config.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const allowedFormats = [
  "jpg",
  "jpeg",
  "png",
  "mp4",
  "pdf",
  "docx",
  "xlsx",
  "xls",
  "csv",
];

// Dynamic storage based on file type
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    try {
      let resourceType = "raw";
      const ext = path
        .extname(file.originalname)
        .replace(".", "")
        .toLowerCase();
      const isAllowed = allowedFormats.includes(ext);

      if (!isAllowed) {
        throw new Error(`File format ${ext} not allowed`);
      }

      if (file?.mimetype?.startsWith("video/")) resourceType = "video";
      else if (file?.mimetype?.startsWith("image/")) resourceType = "image";

      const config = {
        folder: "uploads",
        resource_type: resourceType,
        public_id: "cloud_excel_file", // use static name to overwrite
        overwrite: true,
        invalidate: true, 
      };

      if (resourceType !== "raw") {
        config.allowed_formats = allowedFormats;
      }

      return config;
      
    } catch (err) {
      console.error("❌ Error in CloudinaryStorage params:", err.message);
      throw err;
    }
  },
});

// storage for profile pic
const profilePicStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
    const isAllowed = ["jpg", "jpeg", "png"].includes(ext);
    if (!isAllowed) throw new Error(`File format ${ext} not allowed`);

    return {
      folder: "profile_pics",
      resource_type: "image",
      public_id: `profile_${req.user._id}`, // userId se naam unique hoga
      overwrite: true,
      invalidate: true,
    };
  },
});


export { cloudinary, storage, profilePicStorage};
