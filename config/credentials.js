const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const TOKEN_PATH = path.join(__dirname, "tokens.json");

const credentials = {
  web: {
    client_id:
      "542597503461-khnhdequlg5sc09scokrdios6m1btjr7.apps.googleusercontent.com",
    client_secret: "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",
    redirect_uris: ["http://localhost:5000/auth/google/callback"],
  },
};

const oauth2Client = new google.auth.OAuth2(
  credentials.web.client_id,
  credentials.web.client_secret,
  credentials.web.redirect_uris[0]
);

// Save tokens to file
const saveTokens = (tokens) => {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("Tokens saved successfully.");
  } catch (error) {
    console.error("Error saving tokens:", error.message);
  }
};

// Load tokens from file
const loadTokens = () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oauth2Client.setCredentials(tokens);
      console.log("Tokens loaded successfully.");
    } else {
      console.log("No tokens file found. Please authenticate the app.");
      throw new Error("No tokens found.");
    }
  } catch (error) {
    console.error("Error loading tokens:", error.message);
    throw error;
  }
};

// Refresh access token if expired
const refreshAccessToken = async () => {
  try {
    if (!oauth2Client.credentials.refresh_token) {
      throw new Error("No refresh token is set. Reauthentication required.");
    }

    const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(newTokens);
    saveTokens(newTokens);
    console.log("Access token refreshed and saved.");
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
    throw error;
  }
};

// Generate the Google OAuth URL
const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "profile",
      "email",
    ],
  });
};

console.log("Visit this URL to authenticate the app: ", getAuthUrl());

// Ensure tokens are valid and loaded
const ensureValidTokens = async () => {
  try {
    loadTokens(); // Load tokens first
    const { expiry_date } = oauth2Client.credentials;
    if (!expiry_date || expiry_date <= Date.now()) {
      console.log("Token expired or missing. Refreshing...");
      await refreshAccessToken(); // Refresh token if expired
    } else {
      console.log("Token is valid.");
    }
  } catch (error) {
    console.error("Error ensuring valid tokens:", error.message);
    console.log("Please authenticate the app by visiting the following URL:");
    console.log(getAuthUrl()); // Prompt user to authenticate
    throw new Error(
      "Reauthentication required. Please run the authorization flow."
    );
  }
};

// Upload video to YouTube
const uploadVideo = async (
  videoFileName,
  title,
  description,
  privacyStatus = "public"
) => {
  try {
    // Ensure tokens are valid before uploading
    await ensureValidTokens();

    // Directly use the file path as stored in the database
    const videoPath = videoFileName;

    console.log(`Checking if the video exists at: ${videoPath}`);

    // Verify the file exists
    if (!fs.existsSync(videoPath)) {
      console.error(
        `Video file does not exist at the provided path: ${videoPath}`
      );
      throw new Error(
        `Video file does not exist at the provided path: ${videoPath}`
      );
    }

    // Initialize YouTube API
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // Upload video to YouTube
    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: { title, description },
        status: { privacyStatus },
      },
      media: { body: fs.createReadStream(videoPath) },
    });

    console.log("Video uploaded successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error uploading video to YouTube:", error.message);
    throw error;
  }
};

module.exports = {
  oauth2Client,
  saveTokens,
  loadTokens,
  refreshAccessToken,
  ensureValidTokens,
  getAuthUrl,
  uploadVideo,
};
