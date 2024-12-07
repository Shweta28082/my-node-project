const db = require("../config/db"); // Database connection
const fs = require("fs");
const { uploadVideo } = require("../config/credentials"); // YouTube upload function

// Fetch pending videos
const getPendingVideos = (req, res) => {
  const sqlQuery = "SELECT * FROM users WHERE approval_status = 'pending'";

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Error fetching pending videos:", err);
      return res.status(500).json({ error: "Error fetching pending videos." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No pending videos found." });
    }

    res.json(results); // Return list of pending videos
  });
};
// Approve and upload video
const approveAndUploadVideo = (req, res) => {
  const { profileId, videoPath } = req.body;

  // Validate input
  if (!profileId || !videoPath) {
    return res
      .status(400)
      .json({ error: "Profile ID and video path are required." });
  }

  // Check if the video file exists
  if (!fs.existsSync(videoPath)) {
    return res
      .status(400)
      .json({ error: "Video file does not exist at the provided path." });
  }

  // Update approval status in the database
  const updateQuery =
    "UPDATE users SET approval_status = 'approved' WHERE id = ?";

  db.query(updateQuery, [profileId], (err, results) => {
    if (err) {
      console.error("Error updating approval status:", err);
      return res.status(500).json({ error: "Error updating approval status." });
    }

    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No video found with the given ID." });
    }

    console.log(`Approval status updated for video ID: ${profileId}`);

    // Proceed to upload video
    uploadVideo(videoPath, "Approved Video", "This is an approved video.")
      .then((videoData) => {
        console.log("Video uploaded successfully:", videoData);

        // Respond with YouTube video details
        res.json({
          message: "Video approved and uploaded successfully.",
          youtubeVideoId: videoData.id,
          youtubeLink: `https://www.youtube.com/watch?v=${videoData.id}`,
        });
      })
      .catch((err) => {
        console.error("Error uploading video to YouTube:", err);

        // Rollback approval status if upload fails
        const rollbackQuery =
          "UPDATE users SET approval_status = 'pending' WHERE id = ?";
        db.query(rollbackQuery, [profileId], (rollbackErr) => {
          if (rollbackErr) {
            console.error("Error rolling back approval status:", rollbackErr);
          } else {
            console.log(`Rollback successful for video ID: ${profileId}`);
          }
        });

        res.status(500).json({
          error:
            "Video approved, but upload to YouTube failed. Approval status rolled back.",
        });
      });
  });
};
// Exporting the functions
module.exports = {
  getPendingVideos,
  approveAndUploadVideo,
};
