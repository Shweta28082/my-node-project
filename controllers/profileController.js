const db = require("../config/db");
const path = require("path");

// Create Profile Function
exports.createProfile = (req, res) => {
  const { email, bio, phone } = req.body;

  // Log the incoming request for debugging
  console.log("Request received for profile update");

  // Check if files exist in the request
  const files = req.files || {};

  // Generate file paths for photos if they exist
  const photoPaths = files["photos"]
    ? files["photos"].map((file) =>
        path.posix.join("uploads/photos", file.filename)
      )
    : [];

  // Generate file path for video if it exists
  const videoPath =
    files["video"] && files["video"][0]
      ? path.posix.join("uploads/videos", files["video"][0].filename)
      : null;

  const videoUrl = videoPath ? videoPath.replace(/\\/g, "/") : null;

  // Log the photo paths and video path for debugging
  console.log("Photo paths:", photoPaths);
  console.log("Video path:", videoUrl);

  // SQL query to update user profile
  const sql = `
    UPDATE users SET 
      bio = ?, 
      phone = ?, 
      photos = ?, 
      video_url = ?, 
      approval_status = 'pending'
    WHERE email = ?`;

  // Prepare values for the query
  const values = [
    bio || null,
    phone || null,
    JSON.stringify(photoPaths) || null,
    videoUrl || null,
    email,
  ];

  // Execute the query
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({
        message: "An error occurred while updating the profile.",
        error: err.sqlMessage || err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User  not found. Unable to update the profile.",
      });
    }

    console.log("Profile updated successfully:", result);
    res.json({
      message: "Profile updated successfully.",
    });
  });
};

// Fetch Profile Function
exports.getProfile = (req, res) => {
  const email = req.params.email;

  // SQL query to fetch user profile
  const sql = `SELECT bio, phone, photos, video_url, approval_status FROM users WHERE email = ?`;

  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error("Error fetching profile:", err);
      return res.status(500).json({
        message: "An error occurred while fetching the profile.",
        error: err.sqlMessage || err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "User  not found.",
      });
    }

    res.json(result[0]); // Return the first user profile
  });
};
