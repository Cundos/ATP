import { PhotoEntity } from '../entities';

/**
 * Returns the effective chronological date of a photo.
 * Priority: taken_at -> captured_at -> created_at.
 */
export function getPhotoEffectiveDate(photo: PhotoEntity): Date {
  if (photo.taken_at) {
    return new Date(photo.taken_at);
  }
  if (photo.captured_at) {
    return new Date(photo.captured_at);
  }
  return new Date(photo.created_at);
}

/**
 * Formats a photo effective date in localized human-readable format ('es-AR').
 */
export function formatPhotoDate(
  photo: PhotoEntity,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = getPhotoEffectiveDate(photo);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat('es-AR', defaultOptions).format(date);
}

/**
 * Sorts an array of photos chronologically by their effective date.
 * Default is 'desc' (most recent first).
 */
export function sortPhotosChronologically(
  photos: PhotoEntity[],
  order: 'desc' | 'asc' = 'desc'
): PhotoEntity[] {
  return [...photos].sort((a, b) => {
    const timeA = getPhotoEffectiveDate(a).getTime();
    const timeB = getPhotoEffectiveDate(b).getTime();

    if (timeA === timeB) {
      // Secondary sort: created_at for stable deterministic sort
      return order === 'desc'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
}
