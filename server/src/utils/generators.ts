// ============================================================
// UTILITY GENERATORS
// ============================================================
//
// Helper functions for generating unique identifiers, usernames,
// passwords, and other system-generated values.
//
// ============================================================

import { randomBytes, randomUUID } from "crypto";

// ===================
// PASSWORD GENERATION
// ===================

/**
 * Generate a secure random password meeting SRS requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function generatePassword(length: number = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  // Ensure at least one of each required type
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining with random characters from all sets
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Validate password against SRS requirements
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least 1 uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least 1 lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least 1 number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least 1 special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===================
// USERNAME GENERATION
// ===================

/**
 * Generate a unique username from email
 * Example: john.doe@example.com -> john.doe123
 */
export function generateUsername(email: string): string {
  // Extract local part of email
  const localPart = email.split("@")[0];

  // Clean and limit length
  const cleanName = localPart
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .substring(0, 15);

  // Add random suffix for uniqueness
  const suffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `${cleanName}${suffix}`;
}

// ===================
// ID GENERATION
// ===================

/**
 * Generate a certificate ID
 * Format: CERT-YYYYMMDD-XXXXXX
 */
export function generateCertificateId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `CERT-${dateStr}-${random}`;
}

/**
 * Generate a skill code
 * Format: SKL-XXX-NNN
 */
export function generateSkillCode(name: string): string {
  // Take first 3 characters of name (uppercase)
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `SKL-${prefix}-${random}`;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * Generate a verification token (for email verification, password reset, etc.)
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a short numeric OTP
 */
export function generateOTP(length: number = 6): string {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

// ===================
// SLUG GENERATION
// ===================

/**
 * Generate URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug with random suffix
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlug(text);
  const suffix = randomBytes(2).toString("hex");
  return `${baseSlug}-${suffix}`;
}

// ===================
// FILE NAME GENERATION
// ===================

/**
 * Generate a unique filename preserving extension
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = originalName.split(".").pop() || "";
  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 255);
}
