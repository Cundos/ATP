/**
 * Builds a standardized storage key for plant photo files.
 * Format: photos/{permanent_code}/{file_id}.{extension}
 *
 * @param permanentCode Normalized plant code (e.g. "AT-PL-001")
 * @param fileId Unique identifier for the photo (e.g. UUID)
 * @param extension File extension without leading dot (e.g. "webp", "jpg")
 */
export function buildPhotoStorageKey(
  permanentCode: string,
  fileId: string,
  extension: string
): string {
  const sanitizedCode = permanentCode.trim();
  const sanitizedFileId = fileId.trim();
  const sanitizedExt = extension.trim().replace(/^\.+/, '').toLowerCase();

  return `photos/${sanitizedCode}/${sanitizedFileId}.${sanitizedExt}`;
}

/**
 * Validates whether a storage key is secure and conforms to storage rules.
 * Disallows directory traversal, absolute paths, drive letters, and null bytes.
 */
export function isValidStorageKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Reject null bytes
  if (trimmed.includes('\0')) {
    return false;
  }

  // Reject leading slash/backslash (absolute paths)
  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    return false;
  }

  // Reject Windows drive letters (e.g. C:, D:)
  if (/^[a-zA-Z]:/.test(trimmed)) {
    return false;
  }

  // Reject directory traversal segments (.. or .\ or ../)
  const segments = trimmed.split(/[/\\]/);
  for (const segment of segments) {
    if (segment === '..' || segment === '.') {
      return false;
    }
  }

  // Check valid character set for storage keys (alphanumeric, -, _, ., /)
  if (!/^[a-zA-Z0-9_\-./]+$/.test(trimmed)) {
    return false;
  }

  return true;
}
