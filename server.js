const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const session = require("express-session");
require("dotenv").config();
const db = require("./config/db");
const profileController = require("./controllers/profileController");
const adminRoutes = require("./routes/adminRoutes");
const {
  getAuthUrl,
  saveTokens,
  oauth2Client,
} = require("./config/credentials");

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir =
      file.fieldname === "photos" ? "uploads/photos" : "uploads/videos";
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper: Validate Email
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Signup API
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
    db.query(sql, [email, hashedPassword], (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Email already exists." });
        }
        throw err;
      }
      res.status(201).json({ message: "Signup successful!" });
    });
  } catch (err) {
    console.error("Error during signup:", err.message);
    res.status(500).json({ message: "Signup failed. Please try again." });
  }
});

// Login API
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err.message);
      return res
        .status(500)
        .json({ message: "Login failed. Please try again." });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    try {
      const isMatch = await bcrypt.compare(password, results[0].password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      req.session.user = { id: results[0].id, email: results[0].email };
      res.json({ message: "Login successful!" });
    } catch (bcryptErr) {
      console.error("Bcrypt error:", bcryptErr.message);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });
});

// Profile API
app.post(
  "/api/profile",
  upload.fields([
    { name: "photos", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  profileController.createProfile
);

// Admin Routes
app.use("/api/admin", adminRoutes);

// Google OAuth Routes
app.get("/auth/google", (req, res) => {
  res.redirect(getAuthUrl());
});

app.get("/auth/google/callback", async (req, res) => {
  console.log("Received callback from Google with code:", req.query.code);

  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "No code received." });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user info from Google
    const { data: userInfo } = await oauth2Client.request({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });
    console.log("Google User Info:", userInfo);

    // Check database for user
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [userInfo.email], (err, results) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ message: "Authentication failed." });
      }

      if (results.length === 0) {
        // New user: Insert into database
        const insertSql =
          "INSERT INTO users (email, name, password) VALUES (?, ?, ?)";
        db.query(
          insertSql,
          [userInfo.email, userInfo.name, null],
          (insertErr) => {
            if (insertErr) {
              console.error("Error inserting new user:", insertErr.message);
              return res
                .status(500)
                .json({ message: "Authentication failed." });
            }
            req.session.user = { email: userInfo.email, name: userInfo.name };
            res.redirect(process.env.CLIENT_URL); // Redirect to frontend
          }
        );
      } else {
        // Existing user: Login
        req.session.user = results[0];
        res.redirect(process.env.CLIENT_URL);
      }
    });
  } catch (error) {
    console.error("Google OAuth error:", error.message);
    res.status(500).json({ message: "Authentication failed." });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
