// convertDate.js
import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://falconmsl:nvkjdfjvmgfjlsdgvbj@cluster0.uzw0mpv.mongodb.net/hrms";

const attendanceSchema = new mongoose.Schema({
  date: mongoose.Schema.Types.Mixed,
}, { strict: false });

const Attendance = mongoose.model("Attendance", attendanceSchema, "Attendance");


const convertDateToString = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to DB");

    const records = await Attendance.find().limit(5);
records.forEach(r => console.log(typeof r.date, r.date));


console.log(`📋 Found ${records.length} records to process.`);
    let count = 0;
    for (const record of records) {
      if (record.date instanceof Date) {
        const formattedDate = moment(record.date).format("YYYY-MM-DD");
        record.date = formattedDate;
        await record.save();
        console.log(`✅ Updated: ${record._id} → ${formattedDate}`);
        count++;
      }
    }

    console.log(`🎉 Done. Converted ${count} records.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
};

// convertDateToString();