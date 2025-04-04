const { admin, db } = require("../config/firebase");
const pdf2json = require("pdf2json");
const fs = require("fs").promises;
const path = require("path");

exports.uploadAndConvert = async (req, res) => {
  try {
    console.log("Request received:", req.file);
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID not found" });
    }

    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;
    const filePath = path.join(__dirname, "../../public/uploads", filename);

    console.log("Attempting to save file to:", filePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    console.log("Directory ensured:", path.dirname(filePath));

    // Save the PDF file
    await fs.writeFile(filePath, file.buffer);
    console.log("File saved successfully to:", filePath);

    // Convert PDF to XML using pdf2json with Promise
    const pdfParser = new pdf2json();

    return new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (err) => {
        console.error("PDF parsing error:", err);
        reject(new Error("Failed to parse PDF"));
      });

      pdfParser.on("pdfParser_dataReady", async (pdfData) => {
        try {
          console.log("PDF parsing complete. Generating XML...");
          let xml = pdfParser.getRawTextContent();

          // If getRawTextContent fails, try to extract text from pdfData
          if (!xml || xml.trim() === "") {
            console.warn(
              "Empty or invalid XML from getRawTextContent, attempting manual extraction..."
            );
            xml = extractTextFromPdfData(pdfData);
            if (!xml || xml.trim() === "") {
              console.warn("Manual extraction failed, using fallback.");
              xml = "<xml>Conversion failed: No extractable text content</xml>";
            } else {
              console.log(
                "Manual extraction successful, XML length:",
                xml.length
              );
            }
          } else {
            console.log("XML generated successfully, length:", xml.length);
          }

          // Save to database
          await saveConversion(userId, filename, xml, timestamp);

          // Send response
          res.json({
            xml: xml,
            pdfUrl: `/uploads/${filename}`,
          });
          resolve();
        } catch (err) {
          console.error("Error processing parsed PDF:", err);
          res.status(500).json({ error: "Failed to process PDF data" });
          reject(err);
        }
      });

      console.log("Starting PDF parsing...");
      pdfParser.parseBuffer(file.buffer);
    }).catch((error) => {
      console.error("PDF conversion promise rejected:", error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: "PDF conversion failed: " + error.message });
      }
    });
  } catch (error) {
    console.error("Conversion error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Conversion failed: " + error.message });
    }
  }
};

// Helper function to manually extract text from pdfData
const extractTextFromPdfData = (pdfData) => {
  let textContent = "";
  try {
    if (pdfData && pdfData.Pages) {
      pdfData.Pages.forEach((page) => {
        if (page.Texts) {
          page.Texts.forEach((text) => {
            if (text.R && text.R[0] && text.R[0].T) {
              // Decode URL-encoded text
              const decodedText = decodeURIComponent(text.R[0].T);
              textContent += decodedText + " ";
            }
          });
        }
      });
    }
    if (textContent.trim() === "") {
      return "";
    }
    // Wrap in basic XML structure
    return `<xml><content>${textContent.trim()}</content></xml>`;
  } catch (err) {
    console.error("Error during manual text extraction:", err);
    return "";
  }
};

const saveConversion = async (userId, filename, xml, timestamp) => {
  try {
    const conversionRef = db.collection("conversions").doc();
    await conversionRef.set({
      userId,
      pdfUrl: `/uploads/${filename}`,
      xml,
      timestamp,
    });
    console.log(`Conversion saved for user: ${userId}`);
  } catch (error) {
    console.error("Error saving conversion:", error);
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db
      .collection("conversions")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();
    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(history);
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};
