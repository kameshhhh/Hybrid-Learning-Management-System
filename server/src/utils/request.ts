// ============================================================
// REQUEST UTILITIES
// ============================================================
//
// Helper functions for parsing and validating request data.
//
// ============================================================

/**
 * Safely extract a string value from query parameter
 * Express query params can be string | string[] | undefined
 */
export function getQueryString(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Get query string with a default value
 */
export function getQueryStringOrDefault(
  value: string | string[] | undefined,
  defaultValue: string,
): string {
  const result = getQueryString(value);
  return result !== undefined ? result : defaultValue;
}

/**
 * Parse query parameter to number
 */
export function getQueryNumber(
  value: string | string[] | undefined,
): number | undefined {
  const str = getQueryString(value);
  if (str === undefined) return undefined;
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse query parameter to number with default
 */
export function getQueryNumberOrDefault(
  value: string | string[] | undefined,
  defaultValue: number,
): number {
  const result = getQueryNumber(value);
  return result !== undefined ? result : defaultValue;
}
