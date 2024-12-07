const express = require("express");
const nodemailer = require("nodemailer");
const db = require("../config/db");
const {
  getPendingVideos,
  approveAndUploadVideo,
} = require("../controllers/adminController");

const router = express.Router();

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admins only." });
};

// Route to fetch pending videos
router.get("/pending-videos", getPendingVideos);

// Route to approve and upload a video
router.post("/update-approval", approveAndUploadVideo);

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email notification
const sendApprovalEmail = (userId) => {
  const sql = "SELECT email FROM users WHERE id = ?";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching user email:", err);
      return;
    }

    if (results.length > 0) {
      const userEmail = results[0].email;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: "Profile Approved",
        text: "Congratulations! Your profile has been approved.",
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
    } else {
      console.log("No user found with the given ID.");
    }
  });
};

module.exports = router;
