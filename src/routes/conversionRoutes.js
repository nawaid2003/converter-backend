const express = require("express");
const router = express.Router();
const {
  uploadAndConvert,
  getHistory,
} = require("../controllers/conversionController");
const auth = require("../middleware/auth");

// Route to upload and convert PDF
router.post("/upload", auth, uploadAndConvert);

// Route to get conversion history
router.get("/history", auth, getHistory);

module.exports = router;
