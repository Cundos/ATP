import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiPlantIdentificationService } from '../GeminiPlantIdentificationService';

describe('GeminiPlantIdentificationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns an error when no API key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const service = new GeminiPlantIdentificationService();
    const result = await service.identifyPlant(
      Buffer.from('fake-image-bytes'),
      'image/jpeg'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('GEMINI_API_KEY');
  });

  it('returns an error when image buffer is empty', async () => {
    const service = new GeminiPlantIdentificationService({ apiKey: 'test-key' });
    const result = await service.identifyPlant(Buffer.alloc(0), 'image/jpeg');

    expect(result.success).toBe(false);
    expect(result.error).toContain('vacío');
  });

  it('successfully identifies a plant with valid Gemini response', async () => {
    const mockGeminiJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isPlant: true,
                  scientificName: 'Citrus limon',
                  commonName: 'Limonero',
                  family: 'Rutaceae',
                  confidence: 0.96,
                  description: 'Árbol frutal cítrico de copa redondeada con espinas.',
                  observedHealth: 'Hojas verdes saludables con floración incipiente.',
                  alternativeCandidates: [
                    {
                      scientificName: 'Citrus aurantifolia',
                      commonName: 'Limonero sutil / Lima',
                      confidence: 0.2,
                    },
                  ],
                  notes: 'Identificación concluyente.',
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeminiJson,
    } as unknown as Response);

    const service = new GeminiPlantIdentificationService({
      apiKey: 'valid-test-key',
    });

    const result = await service.identifyPlant(
      Buffer.from('test-image-data'),
      'image/jpeg'
    );

    expect(result.success).toBe(true);
    expect(result.isPlant).toBe(true);
    expect(result.primaryCandidate?.scientificName).toBe('Citrus limon');
    expect(result.primaryCandidate?.commonName).toBe('Limonero');
    expect(result.primaryCandidate?.family).toBe('Rutaceae');
    expect(result.primaryCandidate?.confidence).toBe(0.96);
    expect(result.observedHealth).toContain('Hojas verdes');
    expect(result.alternativeCandidates).toHaveLength(1);
    expect(result.alternativeCandidates?.[0].scientificName).toBe(
      'Citrus aurantifolia'
    );
  });

  it('handles non-plant image detections properly', async () => {
    const mockGeminiJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isPlant: false,
                  notes: 'La imagen muestra una herramienta de jardín, no una planta.',
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeminiJson,
    } as unknown as Response);

    const service = new GeminiPlantIdentificationService({
      apiKey: 'valid-test-key',
    });

    const result = await service.identifyPlant(
      Buffer.from('test-image-data'),
      'image/jpeg'
    );

    expect(result.success).toBe(true);
    expect(result.isPlant).toBe(false);
    expect(result.notes).toContain('no una planta');
  });

  it('handles API error status responses gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'API key not valid. Please pass a valid API key.' },
      }),
    } as unknown as Response);

    const service = new GeminiPlantIdentificationService({
      apiKey: 'invalid-key',
    });

    const result = await service.identifyPlant(
      Buffer.from('test-image-data'),
      'image/jpeg'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('API key not valid');
  });

  it('handles network / timeout aborts', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('The operation was aborted'));

    const service = new GeminiPlantIdentificationService({
      apiKey: 'valid-key',
    });

    const result = await service.identifyPlant(
      Buffer.from('test-image-data'),
      'image/jpeg'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tiempo de espera agotado');
  });
});
