const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

const ImageSchema = new mongoose.Schema({
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});
const Image = mongoose.model('Image', ImageSchema);

// Multer in-memory storage (Vercel အတွက် memory ထဲမှာပဲ ခေတ္တသိမ်းမယ်)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    // Memory buffer ကနေ Cloudinary ဆီ တိုက်ရိုက်ပို့ခြင်း
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "esp32_cam" },
      async (error, result) => {
        if (error) return res.status(500).json(error);

        const newImage = new Image({ imageUrl: result.secure_url });
        await newImage.save();
        
        res.status(200).json({ message: "Success", url: result.secure_url });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = app;
