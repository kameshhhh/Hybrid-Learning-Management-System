// ============================================================
// QUERY PARAMETER UTILITIES
// ============================================================
//
// Helper functions for safely handling Express query parameters.
// Express req.query returns ParsedQs which can be complex nested objects.
// These utilities safely convert them to the expected types.
//
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryValue = any; // Express query can be many types

/**
 * Safely get a single string from query param
 * Returns undefined if value is undefined or empty string
 */
export function queryString(val: QueryValue): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "string") return val === "" ? undefined : val;
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    if (typeof first === "string") return first === "" ? undefined : first;
  }
  return undefined;
}

/**
 * Get string with default value
 */
export function queryStringDefault(
  val: QueryValue,
  defaultVal: string,
): string {
  const result = queryString(val);
  return result !== undefined ? result : defaultVal;
}

/**
 * Get integer from query param with default
 */
export function queryInt(val: QueryValue, defaultVal: number): number {
  const str = queryString(val);
  if (str === undefined) return defaultVal;
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultVal : num;
}

/**
 * Get positive integer from query param (useful for pagination)
 */
export function queryPositiveInt(val: QueryValue, defaultVal: number): number {
  const num = queryInt(val, defaultVal);
  return num > 0 ? num : defaultVal;
}

/**
 * Get boolean from query param
 * Accepts: 'true', '1', 'yes' as true
 * Accepts: 'false', '0', 'no' as false
 */
export function queryBool(val: QueryValue, defaultVal: boolean): boolean {
  const str = queryString(val)?.toLowerCase();
  if (str === undefined) return defaultVal;
  if (["true", "1", "yes"].includes(str)) return true;
  if (["false", "0", "no"].includes(str)) return false;
  return defaultVal;
}

/**
 * Get array from query param (comma-separated or array)
 */
export function queryArray(val: QueryValue): string[] {
  if (val === undefined || val === null) return [];
  if (typeof val === "string")
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(val)) {
    return val.filter((v): v is string => typeof v === "string");
  }
  return [];
}

/**
 * Get enum value from query param
 */
export function queryEnum<T extends string>(
  val: QueryValue,
  validValues: T[],
  defaultVal?: T,
): T | undefined {
  const str = queryString(val) as T | undefined;
  if (str === undefined) return defaultVal;
  if (validValues.includes(str)) return str;
  return defaultVal;
}

// ===================
// PAGINATION HELPERS
// ===================

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parse pagination parameters from query
 */
export function parsePagination(
  pageVal: QueryValue,
  limitVal: QueryValue,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): PaginationParams {
  const {
    page: defaultPage = 1,
    limit: defaultLimit = 20,
    maxLimit = 100,
  } = defaults;

  const page = Math.max(1, queryInt(pageVal, defaultPage));
  const limit = Math.min(
    maxLimit,
    Math.max(1, queryInt(limitVal, defaultLimit)),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// ===================
// RESPONSE HELPERS
// ===================

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Create a paginated response object
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: PaginationParams,
): PaginatedResponse<T> {
  return {
    success: true,
    data: {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    },
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

/**
 * Create a message response
 */
export function messageResponse(message: string) {
  return {
    success: true,
    message,
  };
}
