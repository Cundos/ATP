import { describe, it, expect } from 'vitest';
import { PhotoEntity } from '../../entities';
import {
  getPhotoEffectiveDate,
  formatPhotoDate,
  sortPhotosChronologically,
} from '../photoTimeline';

describe('PhotoTimeline Domain Service', () => {
  const basePhoto: PhotoEntity = {
    id: '018f0000-0000-7000-8000-000000000001',
    plant_id: '018f0000-0000-7000-8000-000000000000',
    file_path: 'photos/AT-PL-001/photo1.webp',
    file_name: 'photo1.webp',
    mime_type: 'image/webp',
    file_size: 1024,
    is_primary: false,
    created_at: new Date('2026-01-10T12:00:00Z'),
  };

  it('resolves effective date with priority taken_at -> captured_at -> created_at', () => {
    // Only created_at
    expect(getPhotoEffectiveDate(basePhoto)).toEqual(new Date('2026-01-10T12:00:00Z'));

    // With captured_at
    const withCaptured: PhotoEntity = {
      ...basePhoto,
      captured_at: new Date('2026-01-05T10:00:00Z'),
    };
    expect(getPhotoEffectiveDate(withCaptured)).toEqual(new Date('2026-01-05T10:00:00Z'));

    // With taken_at overriding captured_at and created_at
    const withTaken: PhotoEntity = {
      ...basePhoto,
      captured_at: new Date('2026-01-05T10:00:00Z'),
      taken_at: new Date('2025-12-25T08:30:00Z'),
    };
    expect(getPhotoEffectiveDate(withTaken)).toEqual(new Date('2025-12-25T08:30:00Z'));
  });

  it('formats photo date nicely in es-AR', () => {
    const photo: PhotoEntity = {
      ...basePhoto,
      taken_at: new Date('2026-05-15T12:00:00Z'),
    };
    const formatted = formatPhotoDate(photo);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('2026');
  });

  it('sorts photos chronologically in descending order by effective date', () => {
    const p1: PhotoEntity = {
      ...basePhoto,
      id: 'p1',
      created_at: new Date('2026-01-01T00:00:00Z'),
    };
    const p2: PhotoEntity = {
      ...basePhoto,
      id: 'p2',
      taken_at: new Date('2026-03-01T00:00:00Z'),
      created_at: new Date('2026-03-05T00:00:00Z'),
    };
    const p3: PhotoEntity = {
      ...basePhoto,
      id: 'p3',
      captured_at: new Date('2026-02-01T00:00:00Z'),
      created_at: new Date('2026-02-10T00:00:00Z'),
    };

    const sortedDesc = sortPhotosChronologically([p1, p2, p3], 'desc');
    expect(sortedDesc.map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);

    const sortedAsc = sortPhotosChronologically([p1, p2, p3], 'asc');
    expect(sortedAsc.map((p) => p.id)).toEqual(['p1', 'p3', 'p2']);
  });

  it('handles invalid or string serialized dates without throwing RangeError', () => {
    const photoWithStringDates = {
      ...basePhoto,
      created_at: '2026-02-15T00:00:00.000Z' as unknown as Date,
      taken_at: 'invalid-date' as unknown as Date,
    };

    expect(() => getPhotoEffectiveDate(photoWithStringDates)).not.toThrow();
    expect(() => formatPhotoDate(photoWithStringDates)).not.toThrow();
    expect(formatPhotoDate(photoWithStringDates)).toContain('2026');

    const photoWithTotallyCorruptedDates = {
      ...basePhoto,
      created_at: 'bad-date' as unknown as Date,
      taken_at: undefined,
      captured_at: undefined,
    };
    expect(() => formatPhotoDate(photoWithTotallyCorruptedDates)).not.toThrow();
  });
});
