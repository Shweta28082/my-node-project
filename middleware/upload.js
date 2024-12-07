const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directories exist
const ensureDirectoryExistence = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure multer storage for photos and videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir =
      file.fieldname === "photos" ? "uploads/photos" : "uploads/videos";
    ensureDirectoryExistence(dir); // Ensure that the directory exists before uploading
    cb(null, dir); // Provide the correct directory based on the fieldname
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now(); // Use timestamp to avoid file name conflicts
    const ext = path.extname(file.originalname); // Get the file extension
    cb(null, `${timestamp}${ext}`); // Use timestamp + original file extension
  },
});

// File filter to allow specific image and video types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
  const allowedVideoTypes = [
    "video/mp4",
    "video/x-msvideo",
    "video/avi",
    "video/quicktime",
  ];

  // Allow files if they are in the allowed types
  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype)
  ) {
    cb(null, true); // Accept the file
  } else {
    cb(
      new Error(
        "Invalid file format. Please upload a JPG, PNG, MP4, AVI, or MOV file."
      ),
      false // Reject the file
    );
  }
};

// Configure multer for handling multiple fields (photos array and single video)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).fields([
  { name: "photos", maxCount: 10 }, // Allow up to 10 photos
  { name: "video", maxCount: 1 }, // Allow only 1 video
]);

module.exports = upload;
