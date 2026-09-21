import {
  IPlantIdentificationService,
  PlantIdentificationResult,
  PlantIdentificationCandidate,
} from '@/core/domain/entities/PlantIdentification';

export interface GeminiServiceOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export class GeminiPlantIdentificationService
  implements IPlantIdentificationService
{
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: GeminiServiceOptions = {}) {
    this.apiKey =
      options.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = options.timeoutMs || 25000;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public async identifyPlant(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<PlantIdentificationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        isPlant: false,
        error:
          'No se configuró la clave de API de Gemini (GEMINI_API_KEY).',
      };
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return {
        success: false,
        isPlant: false,
        error: 'El archivo de imagen está vacío.',
      };
    }

    const base64Data = imageBuffer.toString('base64');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const promptText = `Sos un botánico y agrónomo especialista en identificación de plantas, árboles, flores, arbustos y cactus.
Analizá la imagen provista e identificá si corresponde a una planta, árbol o estructura vegetal (hojas, flores, frutos, tallo, tronco).
Si es una planta:
- Determiná el nombre científico taxonómico más preciso (género y especie, ej: 'Citrus limon', 'Persea americana').
- Determiná el nombre común en español de uso frecuente en Argentina / Sudamérica (ej: 'Limonero', 'Palta', 'Ficus').
- Asigná un nivel de confianza entre 0.0 y 1.0.
- Proveé la familia botánica si es reconocible (ej: 'Rutaceae', 'Lauraceae').
- Si hay dudas o especies visualmente similares, agregá hasta 3 alternativas en alternativeCandidates.
- Indicá observaciones visibles sobre la salud o aspecto (ej: 'Hojas verdes sanas con brotes nuevos', 'Clorosis foliar leve').
Si NO es una planta o la imagen no permite reconocer ninguna vegetación, asigná isPlant = false.`;

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: {
          type: 'OBJECT',
          properties: {
            isPlant: { type: 'BOOLEAN' },
            scientificName: { type: 'STRING' },
            commonName: { type: 'STRING' },
            family: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
            description: { type: 'STRING' },
            observedHealth: { type: 'STRING' },
            alternativeCandidates: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  scientificName: { type: 'STRING' },
                  commonName: { type: 'STRING' },
                  confidence: { type: 'NUMBER' },
                },
              },
            },
            notes: { type: 'STRING' },
          },
          required: ['isPlant'],
        },
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errMessage = `Error de API Gemini: HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errMessage = errData.error.message;
          }
        } catch {
          // ignore parsing error
        }

        return {
          success: false,
          isPlant: false,
          error: errMessage,
        };
      }

      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawText) {
        return {
          success: false,
          isPlant: false,
          error: 'No se recibió respuesta estructurada del modelo de IA.',
        };
      }

      let parsed: {
        isPlant?: boolean;
        scientificName?: string;
        commonName?: string;
        family?: string;
        confidence?: number;
        description?: string;
        observedHealth?: string;
        alternativeCandidates?: Array<{
          scientificName?: string;
          commonName?: string;
          confidence?: number;
        }>;
        notes?: string;
      };

      try {
        parsed = JSON.parse(rawText);
      } catch {
        return {
          success: false,
          isPlant: false,
          error: 'Formato de respuesta no válido recibido de la IA.',
        };
      }

      if (!parsed.isPlant) {
        return {
          success: true,
          isPlant: false,
          notes: parsed.notes || 'La imagen no parece ser una planta o árbol.',
        };
      }

      const primaryCandidate: PlantIdentificationCandidate | null =
        parsed.scientificName || parsed.commonName
          ? {
              scientificName: (parsed.scientificName || '').trim(),
              commonName: (parsed.commonName || parsed.scientificName || '').trim(),
              confidence:
                typeof parsed.confidence === 'number'
                  ? Math.min(Math.max(parsed.confidence, 0), 1)
                  : 0.85,
              family: parsed.family?.trim() || null,
              description: parsed.description?.trim() || null,
              healthObservation: parsed.observedHealth?.trim() || null,
            }
          : null;

      const alternativeCandidates: PlantIdentificationCandidate[] =
        Array.isArray(parsed.alternativeCandidates)
          ? parsed.alternativeCandidates
              .filter(
                (c) => Boolean(c.scientificName || c.commonName)
              )
              .map((c) => ({
                scientificName: (c.scientificName || '').trim(),
                commonName: (c.commonName || c.scientificName || '').trim(),
                confidence:
                  typeof c.confidence === 'number'
                    ? Math.min(Math.max(c.confidence, 0), 1)
                    : 0.5,
              }))
          : [];

      return {
        success: true,
        isPlant: true,
        primaryCandidate,
        alternativeCandidates,
        observedHealth: parsed.observedHealth?.trim() || null,
        notes: parsed.notes?.trim() || null,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message?.includes('aborted'));
      return {
        success: false,
        isPlant: false,
        error: isAbort
          ? 'Tiempo de espera agotado al consultar la IA de identificación.'
          : 'No se pudo conectar con el servicio de IA.',
      };
    }
  }
}
