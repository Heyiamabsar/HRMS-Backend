import mongoose from 'mongoose';
import { fixInvalidLocationDocs } from '../utils/commonUtils.js';

const connectDB = async () => {
  try {
    console.log("MONGO_URI from env:", process.env.MONGO_URI);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // (async () => {
    //   await mongoose.connect(process.env.MONGO_URI);
    //   await fixInvalidLocationDocs();
    //   await mongoose.disconnect();
    // })();

    console.log(`DataBase Connected Successfully`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
