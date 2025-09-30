import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, 
  },
  tz: {
    type: String,
    required: true,
    unique: true 
  },
  code: {
    type: String,
    required: true, 
  },
}, { timestamps: true }); 

const countryTZModel = mongoose.model("Country", countrySchema);

export default countryTZModel;
