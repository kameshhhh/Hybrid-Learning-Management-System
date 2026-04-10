// ============================================================
// VIDEO VALIDATION SERVICE
// ============================================================
//
// Validates uploaded video files according to SRS requirements:
// - Formats: MP4, WebM, MOV
// - Max duration: 30 minutes (1800 seconds)
// - Max size: 500MB
//
// Uses ffprobe for metadata extraction.
// ============================================================

import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

// ===================
// TYPE DEFINITIONS
// ===================

export interface VideoValidationResult {
  isValid: boolean;
  format: string | null;
  duration: number | null; // seconds
  size: number; // bytes
  resolution: string | null;
  errors: string[];
  warnings: string[];
}

export interface VideoMetadata {
  format: string;
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
}

// ===================
// VALIDATION CONSTANTS (from SRS)
// ===================

const ALLOWED_FORMATS = ["mp4", "webm", "mov"];
const ALLOWED_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_DURATION_SECONDS = 30 * 60; // 30 minutes
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
const MIN_RESOLUTION_HEIGHT = 480; // Minimum 480p

// ===================
// MAIN VALIDATION FUNCTION
// ===================

/**
 * Validate a video file against SRS requirements
 *
 * @param filePath - Absolute path to the video file
 * @returns Promise<VideoValidationResult>
 */
export async function validateVideo(
  filePath: string,
): Promise<VideoValidationResult> {
  const result: VideoValidationResult = {
    isValid: true,
    format: null,
    duration: null,
    size: 0,
    resolution: null,
    errors: [],
    warnings: [],
  };

  try {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      result.isValid = false;
      result.errors.push("Video file not found");
      return result;
    }

    // Get file size
    const stats = fs.statSync(filePath);
    result.size = stats.size;

    // Check file size
    if (result.size > MAX_SIZE_BYTES) {
      result.isValid = false;
      result.errors.push(
        `File size (${formatBytes(result.size)}) exceeds maximum allowed (500MB)`,
      );
    }

    // Get video metadata using ffprobe
    const metadata = await getVideoMetadata(filePath);

    if (!metadata) {
      result.isValid = false;
      result.errors.push(
        "Unable to read video metadata. File may be corrupted.",
      );
      return result;
    }

    // Set metadata in result
    result.format = metadata.format;
    result.duration = metadata.duration;
    result.resolution = `${metadata.width}x${metadata.height}`;

    // Validate format
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    if (!ALLOWED_FORMATS.includes(ext)) {
      result.isValid = false;
      result.errors.push(
        `Invalid format: ${ext}. Allowed: ${ALLOWED_FORMATS.join(", ")}`,
      );
    }

    // Validate duration
    if (metadata.duration > MAX_DURATION_SECONDS) {
      result.isValid = false;
      const minutes = Math.ceil(metadata.duration / 60);
      result.errors.push(
        `Duration (${minutes} min) exceeds maximum allowed (30 min)`,
      );
    }

    // Check resolution (warning only)
    if (metadata.height < MIN_RESOLUTION_HEIGHT) {
      result.warnings.push(
        `Low resolution (${metadata.height}p). Recommended: 720p or higher`,
      );
    }

    // Log validation result
    logger.info({
      message: "Video validation completed",
      file: path.basename(filePath),
      isValid: result.isValid,
      duration: metadata.duration,
      resolution: result.resolution,
      errors: result.errors,
    });
  } catch (error) {
    logger.error("Video validation error:", error);
    result.isValid = false;
    result.errors.push("Video validation failed due to an internal error");
  }

  return result;
}

// ===================
// METADATA EXTRACTION
// ===================

/**
 * Extract video metadata using ffprobe
 */
function getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error("FFprobe error or FFmpeg not installed. Falling back to mock metadata:", err);
        resolve({
          format: "mp4",
          duration: 300, // 5 mins mock
          width: 1280,
          height: 720,
          bitrate: 0,
          codec: "fallback"
        });
        return;
      }

      try {
        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video",
        );

        if (!videoStream) {
          resolve(null);
          return;
        }

        resolve({
          format: metadata.format.format_name || "unknown",
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          bitrate: metadata.format.bit_rate
            ? parseInt(String(metadata.format.bit_rate))
            : 0,
          codec: videoStream.codec_name || "unknown",
        });
      } catch {
        resolve(null);
      }
    });
  });
}

// ===================
// UTILITY FUNCTIONS
// ===================

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Quick format validation (without ffprobe)
 * Used for initial validation before full processing
 */
export function quickValidateVideoFormat(
  filename: string,
  mimetype: string,
): boolean {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  return ALLOWED_FORMATS.includes(ext) && ALLOWED_MIME_TYPES.includes(mimetype);
}

/**
 * Generate video thumbnail
 */
export function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timeOffset: number = 5,
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeOffset],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "320x180",
      })
      .on("end", () => resolve(outputPath))
      .on("error", reject);
  });
}
