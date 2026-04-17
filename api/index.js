const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

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
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

const ImageSchema = new mongoose.Schema({
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});
const Image = mongoose.model('Image', ImageSchema);

// Multer in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('image'), async (req, res) => {
  console.log("📸 Received a request from ESP32-CAM...");

  try {
    if (!req.file) {
      console.log("⚠️ No image file found in the request.");
      return res.status(400).send("No file uploaded");
    }

    console.log(`📦 File received: ${req.file.originalname} (${req.file.size} bytes)`);

    // Memory buffer ကနေ Cloudinary ဆီ တိုက်ရိုက်ပို့ခြင်း
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "esp32_cam" },
      async (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Upload Error:", error);
          return res.status(500).json(error);
        }

        console.log("☁️ Uploaded to Cloudinary successfully:", result.secure_url);

        const newImage = new Image({ imageUrl: result.secure_url });
        await newImage.save();
        
        console.log("💾 Image URL saved to MongoDB Atlas.");
        res.status(200).json({ message: "Success", url: result.secure_url });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error("🔥 Server Error:", err.message);
    res.status(500).send(err.message);
  }
});

module.exports = app;
