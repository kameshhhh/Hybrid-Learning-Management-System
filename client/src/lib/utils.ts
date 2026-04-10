/**
 * ============================================================
 * UTILITY FUNCTIONS
 * ============================================================
 *
 * This file contains utility functions used throughout the
 * application. These are helper functions that make working
 * with CSS classes, formatting, and other common operations
 * easier and more consistent.
 *
 * ============================================================
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn (className) - Merges class names intelligently
 *
 * This function combines multiple class names and handles:
 * - Conditional classes (with clsx)
 * - Tailwind class conflicts (with tailwind-merge)
 *
 * @example
 * // Basic usage
 * cn('glass', 'p-4') // returns 'glass p-4'
 *
 * // With conditionals
 * cn('btn', isActive && 'btn-active') // returns 'btn btn-active' or 'btn'
 *
 * // Handling Tailwind conflicts
 * cn('p-2', 'p-4') // returns 'p-4' (resolves conflict)
 *
 * @param inputs - Any number of class values (strings, objects, arrays)
 * @returns A merged string of class names
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * formatDate - Formats a date to a readable string
 *
 * @param date - The date to format (string, Date, or number)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // "Jan 15, 2024"
 * formatDate('2024-01-15', { dateStyle: 'full' }) // "Monday, January 15, 2024"
 */
export function formatDate(
  date: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("en-US", options).format(new Date(date));
}

/**
 * formatTime - Formats time to readable string
 *
 * @param date - The date/time to format
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(date: string | Date | number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/**
 * formatDateTime - Combines date and time formatting
 *
 * @param date - The date/time to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date | number): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * formatRelativeTime - Shows relative time (e.g., "2 hours ago")
 *
 * @param date - The date to compare against now
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | number): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}

/**
 * formatNumber - Formats numbers with commas and optional decimal places
 *
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.567, 2) // "1,234.57"
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * formatPercentage - Formats a number as a percentage
 *
 * @param value - The decimal value (e.g., 0.75 for 75%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.756) // "75.6%"
 * formatPercentage(75.6, 0, false) // "76%" (already a percentage)
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  isDecimal: boolean = true,
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * formatBytes - Converts bytes to human-readable format
 *
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted string (e.g., "1.5 MB")
 *
 * @example
 * formatBytes(1024) // "1 KB"
 * formatBytes(1234567) // "1.18 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * formatDuration - Converts seconds to readable duration
 *
 * @param seconds - Total seconds
 * @returns Formatted duration (e.g., "12:34" or "1:02:34")
 *
 * @example
 * formatDuration(125) // "2:05"
 * formatDuration(3725) // "1:02:05"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * truncateText - Truncates text to specified length with ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with "..." if needed
 *
 * @example
 * truncateText('Hello World', 8) // "Hello..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * capitalize - Capitalizes the first letter of each word
 *
 * @param text - The text to capitalize
 * @returns Capitalized text
 *
 * @example
 * capitalize('hello world') // "Hello World"
 */
export function capitalize(text: string): string {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * slugify - Converts text to URL-friendly slug
 *
 * @param text - The text to slugify
 * @returns URL-friendly slug
 *
 * @example
 * slugify('Hello World!') // "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * debounce - Creates a debounced version of a function
 *
 * @param func - The function to debounce
 * @param wait - Milliseconds to wait before calling
 * @returns Debounced function
 *
 * @example
 * const debouncedSearch = debounce(search, 300);
 * debouncedSearch('query'); // Only calls search after 300ms of no calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * throttle - Creates a throttled version of a function
 *
 * @param func - The function to throttle
 * @param limit - Minimum milliseconds between calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * generateId - Generates a random ID string
 *
 * @param length - Length of the ID (default: 8)
 * @returns Random ID string
 */
export function generateId(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

/**
 * sleep - Pauses execution for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after ms
 *
 * @example
 * await sleep(1000); // Waits 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * isValidEmail - Validates email format
 *
 * @param email - Email to validate
 * @returns Boolean indicating validity
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
}

/**
 * getInitials - Gets initials from a name
 *
 * @param name - Full name
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Initials string
 *
 * @example
 * getInitials('John Doe') // "JD"
 * getInitials('John') // "J"
 */
export function getInitials(name: string, maxInitials: number = 2): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, maxInitials)
    .join("")
    .toUpperCase();
}

/**
 * clamp - Clamps a number between min and max values
 *
 * @param value - The number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * getErrorMessage - Extracts error message from unknown error
 *
 * @param error - Unknown error object
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

/**
 * getAssetUrl - Constructs a full URL for an asset, handling VITE_API_URL
 * correctly even if it's missing or defined as "undefined" string.
 *
 * @param path - The relative path of the asset (e.g., "/uploads/...")
 * @returns Full URL or relative path
 */
export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return "";

  // If already an absolute URL or blob, return as is
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const apiUrl = import.meta.env.VITE_API_URL;

  // Handle case where VITE_API_URL is missing or literally the string "undefined"
  if (apiUrl && apiUrl !== "undefined" && apiUrl !== "") {
    try {
      // If apiUrl is an absolute URL (e.g., http://localhost:5000/api/v1)
      // we only want the origin (http://localhost:5000) for assets
      if (apiUrl.startsWith('http')) {
        const url = new URL(apiUrl);
        const origin = url.origin;
        
        // CRITICAL FIX: Use relative paths for local uploads to benefit from Vite proxy
        // This resolves the CORS/404 issues on localhost:3000
        if (path.startsWith("/uploads/")) {
          return path;
        }

        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return `${origin}${normalizedPath}`;
      }
      
      // Fallback for relative API URLs
      const normalizedApiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return `${normalizedApiUrl}${normalizedPath}`;
    } catch (e) {
      // Silent fallback
    }
  }

  // If VITE_API_URL is missing in development, fallback to known backend port
  // to bypass proxy issues during development.
  if (import.meta.env.DEV) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `http://localhost:5000${normalizedPath}`;
  }

  // If VITE_API_URL is missing in production, return relative path
  return path;
}
