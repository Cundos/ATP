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

  it('properly sanitizes and extracts fields when model outputs dictionary string in scientificName', async () => {
    const rawMalformedScientificName =
      "Epipremnum aureumcv. Jade', 'commonName': 'Potus verde', 'confidence': 0.95, 'family': 'Araceae', 'observedHealth': 'Planta en buen estado general con algunas marcas mecánicas', 'description': 'Planta trepadora de interior', 'alternativeCandidates': [{'scientificName': 'Philodendron hederaceum', 'commonName': 'Filodendro limón'}]";

    const mockGeminiJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isPlant: true,
                  scientificName: rawMalformedScientificName,
                  confidence: 0.85,
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
    expect(result.primaryCandidate?.scientificName).toBe(
      'Epipremnum aureum cv. Jade'
    );
    expect(result.primaryCandidate?.commonName).toBe('Potus verde');
    expect(result.primaryCandidate?.family).toBe('Araceae');
    expect(result.primaryCandidate?.confidence).toBe(0.95);
    expect(result.primaryCandidate?.healthObservation).toBe(
      'Planta en buen estado general con algunas marcas mecánicas'
    );
  });

  it('automatically falls back to secondary model when primary model returns 503 high demand', async () => {
    const mockSuccessJson = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  isPlant: true,
                  scientificName: 'Persea americana',
                  commonName: 'Palta',
                  confidence: 0.92,
                }),
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: { message: 'This model is currently experiencing high demand.' },
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessJson,
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
    expect(result.primaryCandidate?.scientificName).toBe('Persea americana');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
