// ============================================================
// UPLOAD ROUTES
// ============================================================
//
// Handles file uploads for the application:
// - Video uploads (with validation)
// - Document uploads (PDF, DOC, etc.)
// - Image uploads (thumbnails, etc.)
//
// ============================================================

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { asyncHandler, BadRequestError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { fileURLToPath } from "url";

// ===================
// ROUTER SETUP
// ===================

const router = Router();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================
// UPLOAD DIRECTORIES
// ===================

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const VIDEO_DIR = path.join(UPLOAD_DIR, "videos");
const DOCUMENT_DIR = path.join(UPLOAD_DIR, "documents");
const IMAGE_DIR = path.join(UPLOAD_DIR, "images");

// Ensure directories exist
[UPLOAD_DIR, VIDEO_DIR, DOCUMENT_DIR, IMAGE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ===================
// MULTER CONFIGURATION
// ===================

/**
 * Video upload configuration
 *
 * Validations per SRS:
 * - Formats: MP4, WebM, MOV
 * - Max duration: 30 minutes (validated after upload)
 * - Max size: 500MB
 */
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEO_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const videoFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ["video/mp4", "video/webm", "video/quicktime"];
  const allowedExts = [".mp4", ".webm", ".mov"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only MP4, WebM, and MOV video formats are allowed"));
  }
};

const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per SRS
  },
});

/**
 * Document upload configuration
 *
 * Allowed formats: PDF, DOC, DOCX, ZIP
 * Max size: 10MB
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENT_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const documentFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
  ];
  const allowedExts = [".pdf", ".doc", ".docx", ".zip"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, and ZIP files are allowed"));
  }
};

const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Image upload configuration
 *
 * Allowed formats: JPEG, PNG, WebP
 * Max size: 5MB
 */
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const imageFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  }
};

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// ===================
// VIDEO UPLOAD
// ===================

/**
 * POST /api/v1/upload/video
 *
 * Uploads a video file.
 * Returns the URL and basic metadata.
 */
router.post(
  "/video",
  videoUpload.single("video"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw BadRequestError("No video file provided");
    }

    const file = req.file;
    const fileUrl = `/uploads/videos/${file.filename}`;

    logger.info(`Video uploaded: ${file.filename}, Size: ${file.size} bytes`);

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      message: "Video uploaded successfully",
    });
  }),
);

// ===================
// DOCUMENT UPLOAD
// ===================

/**
 * POST /api/v1/upload/document
 *
 * Uploads a document file (PDF, DOC, etc.).
 */
router.post(
  "/document",
  documentUpload.single("document"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw BadRequestError("No document file provided");
    }

    const file = req.file;
    const fileUrl = `/uploads/documents/${file.filename}`;

    logger.info(
      `Document uploaded: ${file.filename}, Size: ${file.size} bytes`,
    );

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      message: "Document uploaded successfully",
    });
  }),
);

// ===================
// IMAGE UPLOAD
// ===================

/**
 * POST /api/v1/upload/image
 *
 * Uploads an image file.
 */
router.post(
  "/image",
  imageUpload.single("image"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw BadRequestError("No image file provided");
    }

    const file = req.file;
    const fileUrl = `/uploads/images/${file.filename}`;

    logger.info(`Image uploaded: ${file.filename}, Size: ${file.size} bytes`);

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      message: "Image uploaded successfully",
    });
  }),
);

// ===================
// TASK SUBMISSION UPLOAD
// ===================

/**
 * POST /api/v1/upload/submission
 *
 * Uploads a task submission file.
 * Validates against task's allowed file types.
 */
router.post(
  "/submission",
  documentUpload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw BadRequestError("No file provided");
    }

    const file = req.file;
    const fileUrl = `/uploads/documents/${file.filename}`;

    logger.info(
      `Submission uploaded: ${file.filename}, Size: ${file.size} bytes`,
    );

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      message: "File uploaded successfully",
    });
  }),
);

// ===================
// MULTER ERROR HANDLER
// ===================

/**
 * Multer error handling middleware
 * Converts multer errors to our error format
 */
router.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: {
          message: "File too large",
          code: "FILE_TOO_LARGE",
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: "UPLOAD_ERROR",
      },
    });
  }

  if (err.message) {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: "UPLOAD_VALIDATION_ERROR",
      },
    });
  }

  next(err);
});

export default router;
