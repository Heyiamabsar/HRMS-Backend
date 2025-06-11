import xlsx from 'xlsx';
import axios from 'axios';

export const uploadExcelToCloudinary = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded or file format not allowed' 
      });
    }

    const uploadedFile = req.file;
    console.log('📁 Uploaded File:', req.file);

        if (!uploadedFile.path) {
      return res.status(400).json({
        success: false,
        message: 'File not uploaded to Cloudinary',
      });
    }

    if (!uploadedFile || !uploadedFile.path) {
      return res.status(400).json({ success: false, message: 'File not uploaded' });
    }

    const fileUrl = uploadedFile.path;
    const cacheBustedUrl = `${fileUrl}?t=${Date.now()}`;

    const fileBuffer = await fetch(cacheBustedUrl).then(res => res.arrayBuffer());
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    return res.status(200).json({
      success: true,
      message: 'Excel file uploaded to Cloudinary',
      fileUrl,
      count: sheetData.length,
      data: sheetData
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Upload failed',
      error: error.stack
    });
  }
};

export const fetchExcelFromCloudinary = async (req, res) => {
  try {

    const { fileUrl } = req.query;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'fileUrl query param is required',
      });
    }

      const cacheBustedUrl = `${fileUrl}?t=${Date.now()}`;
      const response = await axios.get(cacheBustedUrl, { responseType: 'arraybuffer' });


    const workbook = xlsx.read(response.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

       return res.status(200).json({
      success: true,
      data: jsonData,
      count: jsonData.length,
    });
  } catch (err) {
     console.error('❌ Fetch Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch Excel file',
    });
  }
};
