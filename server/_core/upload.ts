import { Router } from "express";
import multer from "multer";
import { uploadFile, deleteFile } from "../storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const router = Router();

// POST /api/upload — multipart form with a "file" field
router.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const result = await uploadFile(req.file.buffer, req.file.originalname, {
      contentType: req.file.mimetype,
    });

    res.json(result);
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// DELETE /api/upload — JSON body with { fileKey }
router.delete("/api/upload", async (req, res) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey || typeof fileKey !== "string") {
      res.status(400).json({ error: "fileKey is required" });
      return;
    }

    await deleteFile(fileKey);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

export { router as uploadRouter };
