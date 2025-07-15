
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // auto expire after 7 days
});

const refreshModel= mongoose.model("RefreshToken", refreshTokenSchema)

export default refreshModel;
