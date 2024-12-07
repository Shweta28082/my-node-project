const { google } = require("googleapis");
require("dotenv").config(); // Ensure environment variables are loaded

// OAuth2 client setup for YouTube API
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI // Load redirect URI from .env
);

// Function to generate the YouTube authentication URL
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Offline access to get refresh token
    scope: ["https://www.googleapis.com/auth/youtube.upload"], // YouTube upload scope
  });
}
 

// Function to get access token after user authorization
async function getAccessToken(code) {
  try {
    console.log("Authorization code received:", code);
    const { tokens } = await oauth2Client.getToken(code); // Exchange code for tokens
    oauth2Client.setCredentials(tokens); // Set tokens in the OAuth client
    console.log("Access token retrieved:", tokens);
    return tokens; // Return tokens to the caller
  } catch (err) {
    console.error("Error retrieving access token:", err.message);
    throw err; // Propagate error for the caller to handle
  }
}


// Export OAuth2 client and functions
module.exports = { oauth2Client, getAuthUrl, getAccessToken };
