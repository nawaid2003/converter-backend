const express = require("express");
const cors = require("cors");
const multer = require("multer");
const conversionRoutes = require("./routes/conversionRoutes");
require("dotenv").config({ path: "./.env" });

console.log("Loaded env variables:");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log(
  "FIREBASE_PRIVATE_KEY:",
  process.env.FIREBASE_PRIVATE_KEY ? "[REDACTED]" : undefined
);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("public/uploads")); // Serve static files
app.use("/api", upload.single("pdf"), conversionRoutes);

// Export the app for Vercel
module.exports = app;
