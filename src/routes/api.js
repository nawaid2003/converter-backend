const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const {
  uploadAndConvert,
  getHistory,
} = require("../controllers/conversionController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", auth, upload.single("pdf"), uploadAndConvert);
router.get("/history", auth, getHistory);

module.exports = router;
