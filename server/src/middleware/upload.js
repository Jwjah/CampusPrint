/**
 * Upload middleware — Uses Cloudinary for cloud storage
 * Files are uploaded to Cloudinary and the URL is stored in the database.
 * This ensures files persist across Render deploys.
 */
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage (files stay in RAM, then get uploaded to Cloudinary)
const storage = multer.memoryStorage();

/**
 * Magic bytes map — validates actual file content, not just MIME headers which can be spoofed.
 * Attackers can rename any file to .pdf and set mimetype: 'application/pdf'.
 * Reading the first bytes confirms the actual file format.
 */
const MAGIC_BYTES = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]], // Old .doc format
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4B, 0x03, 0x04], // PK (ZIP header – .docx is a zip)
  ],
};

const verifyMagicBytes = (buffer, mimetype) => {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return false; // Unlisted type — reject
  return signatures.some(sig => sig.every((byte, i) => buffer[i] === byte));
};

const fileFilter = (req, file, cb) => {
  const allowed = Object.keys(MAGIC_BYTES);
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only PDF, images, and Word documents are allowed'), false);
  }
  // Magic bytes will be verified in verifyMagicBytes after the buffer is available
  // (multer fileFilter runs before the full buffer is available, so we do a deferred check)
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
});

/**
 * Upload a file buffer to Cloudinary.
 * Returns { url, public_id }
 */
const uploadToCloudinary = (fileBuffer, originalName) => {
  const isVercel = !!process.env.VERCEL;
  const fs = require('fs');
  const path = require('path');
  const uploadPath = isVercel ? '/tmp/uploads' : path.join(__dirname, '../../uploads');

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('Cloudinary not configured. Using local filesystem fallback.');
    const filename = `${uuidv4()}-${originalName}`;
    fs.mkdirSync(uploadPath, { recursive: true });
    fs.writeFileSync(path.join(uploadPath, filename), fileBuffer);
    return Promise.resolve({
      url: `/uploads/${filename}`,
      public_id: filename
    });
  }

  return new Promise((resolve, reject) => {
    const uniqueName = `campusprint/${uuidv4()}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: uniqueName,
        resource_type: 'auto', // auto-detect (image, pdf, etc.)
        folder: 'campusprint',
      },
      (error, result) => {
        if (error) {
          console.warn('Cloudinary upload error, falling back to local filesystem:', error);
          const filename = `${uuidv4()}-${originalName}`;
          fs.mkdirSync(uploadPath, { recursive: true });
          fs.writeFileSync(path.join(uploadPath, filename), fileBuffer);
          resolve({
            url: `/uploads/${filename}`,
            public_id: filename
          });
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

module.exports = upload;
module.exports.uploadToCloudinary = uploadToCloudinary;
module.exports.verifyMagicBytes = verifyMagicBytes;
