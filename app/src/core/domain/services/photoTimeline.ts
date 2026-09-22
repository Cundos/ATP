import { PhotoEntity } from '../entities';

/**
 * Helper to safely parse any Date or date-like string/value into a valid Date object.
 * Falls back to fallbackDate or new Date() if invalid.
 */
function safeParseDate(value: unknown, fallbackDate: Date = new Date()): Date {
  if (!value) return fallbackDate;
  const d = value instanceof Date ? value : new Date(value as string | number);
  return isNaN(d.getTime()) ? fallbackDate : d;
}

/**
 * Returns the effective chronological date of a photo.
 * Priority: taken_at -> captured_at -> created_at.
 * Always returns a valid Date (defaults to current date if all values are invalid).
 */
export function getPhotoEffectiveDate(photo: PhotoEntity): Date {
  if (photo.taken_at) {
    const d = safeParseDate(photo.taken_at, safeParseDate(photo.created_at));
    if (!isNaN(d.getTime())) return d;
  }
  if (photo.captured_at) {
    const d = safeParseDate(photo.captured_at, safeParseDate(photo.created_at));
    if (!isNaN(d.getTime())) return d;
  }
  return safeParseDate(photo.created_at, new Date());
}

/**
 * Formats a photo effective date in localized human-readable format ('es-AR').
 * Never throws RangeError on invalid date values.
 */
export function formatPhotoDate(
  photo: PhotoEntity,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = getPhotoEffectiveDate(photo);
  if (isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };
  try {
    return new Intl.DateTimeFormat('es-AR', defaultOptions).format(date);
  } catch {
    return 'Fecha no disponible';
  }
}

/**
 * Sorts an array of photos chronologically by their effective date.
 * Default is 'desc' (most recent first).
 */
export function sortPhotosChronologically(
  photos: PhotoEntity[],
  order: 'desc' | 'asc' = 'desc'
): PhotoEntity[] {
  if (!photos || !Array.isArray(photos)) return [];
  return [...photos].sort((a, b) => {
    const timeA = getPhotoEffectiveDate(a).getTime();
    const timeB = getPhotoEffectiveDate(b).getTime();

    if (timeA === timeB) {
      const createdA = safeParseDate(a.created_at).getTime();
      const createdB = safeParseDate(b.created_at).getTime();
      return order === 'desc' ? createdB - createdA : createdA - createdB;
    }

    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
}
