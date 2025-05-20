import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
   _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
   url: { type: String }, // Cloudinary secure URL
  public_id: { type: String }, // Cloudinary public ID
  filename: {type: String},
  mimetype:  {type: String},
  size:  {type: Number},
  
});

const uploadSchema = new mongoose.Schema({
  title: { type: String, required: true,  },
  files: [fileSchema], 
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  uploadedAt: { type: Date, default: Date.now, },
  userId : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
});
const UploadModel = mongoose.model('Upload', uploadSchema);

export default UploadModel;
