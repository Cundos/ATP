import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { GeminiPlantIdentificationService } from '@/infrastructure/ai/GeminiPlantIdentificationService';

describe('POST /api/integrations/ai/identify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 415 if Content-Type is invalid', async () => {
    const req = new NextRequest('http://localhost/api/integrations/ai/identify', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
      },
      body: 'invalid body',
    });

    const res = await POST(req);
    expect(res.status).toBe(415);
    const data = await res.json();
    expect(data.error).toContain('no soportado');
  });

  it('returns 400 if multipart form data has no photo', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/integrations/ai/identify', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No se incluyó ninguna imagen');
  });

  it('returns 200 and candidate data when AI successfully identifies plant', async () => {
    const identifySpy = vi
      .spyOn(GeminiPlantIdentificationService.prototype, 'identifyPlant')
      .mockResolvedValue({
        success: true,
        isPlant: true,
        primaryCandidate: {
          scientificName: 'Citrus limon',
          commonName: 'Limonero',
          confidence: 0.95,
          family: 'Rutaceae',
          description: 'Árbol frutal cítrico',
          healthObservation: 'Hojas verdes sanas',
        },
        alternativeCandidates: [],
      });

    const formData = new FormData();
    const blob = new Blob([Buffer.from('fake-image-bytes')], { type: 'image/jpeg' });
    formData.append('photo', blob, 'plant.jpg');

    const req = new NextRequest('http://localhost/api/integrations/ai/identify', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isPlant).toBe(true);
    expect(data.primaryCandidate.scientificName).toBe('Citrus limon');
    expect(identifySpy).toHaveBeenCalledTimes(1);
  });

  it('returns 422 if AI service fails or returns success: false', async () => {
    const identifySpy = vi
      .spyOn(GeminiPlantIdentificationService.prototype, 'identifyPlant')
      .mockResolvedValue({
        success: false,
        isPlant: false,
        error: 'API key not configured',
      });

    const formData = new FormData();
    const blob = new Blob([Buffer.from('fake-image-bytes')], { type: 'image/jpeg' });
    formData.append('photo', blob, 'plant.jpg');

    const req = new NextRequest('http://localhost/api/integrations/ai/identify', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain('API key not configured');
    expect(identifySpy).toHaveBeenCalledTimes(1);
  });

  it('handles base64 JSON payload properly', async () => {
    const identifySpy = vi
      .spyOn(GeminiPlantIdentificationService.prototype, 'identifyPlant')
      .mockResolvedValue({
        success: true,
        isPlant: true,
        primaryCandidate: {
          scientificName: 'Monstera deliciosa',
          commonName: 'Costilla de Adán',
          confidence: 0.98,
        },
      });

    const req = new NextRequest('http://localhost/api/integrations/ai/identify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: Buffer.from('fake-bytes').toString('base64'),
        mimeType: 'image/jpeg',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.primaryCandidate.scientificName).toBe('Monstera deliciosa');
    expect(identifySpy).toHaveBeenCalledTimes(1);
  });
});
