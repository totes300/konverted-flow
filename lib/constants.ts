/**
 * Maximum file size for image uploads (5MB).
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed MIME types for image uploads.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/**
 * Maximum comment length.
 */
export const MAX_COMMENT_LENGTH = 10000;

/**
 * Check if a file type is an allowed image type.
 */
export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

/**
 * Get human-readable file size limit.
 */
export function getFileSizeLimitText(): string {
  return `${MAX_FILE_SIZE / (1024 * 1024)}MB`;
}
