import {
  IPlantIdentificationService,
  PlantIdentificationResult,
  PlantIdentificationCandidate,
} from '@/core/domain/entities/PlantIdentification';

export interface GeminiServiceOptions {
  apiKey?: string;
  model?: string;
  fallbackModels?: string[];
  timeoutMs?: number;
}

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

export class GeminiPlantIdentificationService
  implements IPlantIdentificationService
{
  private apiKey: string;
  private models: string[];
  private timeoutMs: number;

  constructor(options: GeminiServiceOptions = {}) {
    this.apiKey =
      options.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    const primaryModel =
      options.model || process.env.GEMINI_MODEL || DEFAULT_MODELS[0];
    const fallbackList = options.fallbackModels || DEFAULT_MODELS;
    this.models = Array.from(new Set([primaryModel, ...fallbackList]));
    this.timeoutMs = options.timeoutMs || 15000;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  private sanitizeCandidate(raw: {
    scientificName?: string;
    commonName?: string;
    family?: string;
    confidence?: number;
    description?: string;
    observedHealth?: string;
  }): {
    scientificName: string;
    commonName: string;
    family: string | null;
    confidence: number;
    description: string | null;
    observedHealth: string | null;
  } {
    let scientificName = (raw.scientificName || '').trim();
    let commonName = (raw.commonName || '').trim();
    let family = raw.family ? String(raw.family).trim() : null;
    let description = raw.description ? String(raw.description).trim() : null;
    let observedHealth = raw.observedHealth
      ? String(raw.observedHealth).trim()
      : null;
    let confidence =
      typeof raw.confidence === 'number' ? raw.confidence : 0.85;

    // Check if scientificName contains concatenated/dictionary fields
    if (
      scientificName.includes('commonName') ||
      scientificName.includes('observedHealth') ||
      scientificName.includes('description') ||
      scientificName.includes('family')
    ) {
      const sciMatch = scientificName.match(/^([^'",:]+)/);
      const commonMatch = scientificName.match(
        /['"]?commonName['"]?\s*:\s*['"]([^'"]+)['"]/i
      );
      const famMatch = scientificName.match(
        /['"]?family['"]?\s*:\s*['"]([^'"]+)['"]/i
      );
      const healthMatch = scientificName.match(
        /['"]?observedHealth['"]?\s*:\s*['"]([^'"]+)['"]/i
      );
      const descMatch = scientificName.match(
        /['"]?description['"]?\s*:\s*['"]([^'"]+)['"]/i
      );
      const confMatch = scientificName.match(
        /['"]?confidence['"]?\s*:\s*([0-9.]+)/i
      );

      if (sciMatch && sciMatch[1]) scientificName = sciMatch[1].trim();
      if (commonMatch && commonMatch[1]) commonName = commonMatch[1].trim();
      if (famMatch && famMatch[1]) family = famMatch[1].trim();
      if (healthMatch && healthMatch[1]) observedHealth = healthMatch[1].trim();
      if (descMatch && descMatch[1]) description = descMatch[1].trim();
      if (confMatch && confMatch[1]) confidence = parseFloat(confMatch[1]);
    }

    // Fix missing space before 'cv.' in botanical names (e.g., 'Epipremnum aureumcv. Jade' -> 'Epipremnum aureum cv. Jade')
    scientificName = scientificName.replace(/([a-z])cv\./i, '$1 cv.');

    return {
      scientificName,
      commonName: commonName || scientificName,
      family,
      confidence: Math.min(Math.max(confidence, 0), 1),
      description,
      observedHealth,
    };
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
    const systemPromptText = `Sos un botánico y agrónomo especialista en identificación de plantas, árboles, flores, arbustos y cactus.
Analizá la imagen provista e identificá si corresponde a una planta, árbol o estructura vegetal (hojas, flores, frutos, tallo, tronco).
Si es una planta:
- scientificName: Nombre científico taxonómico exacto (género y especie, ej: 'Citrus limon', 'Epipremnum aureum', 'Persea americana'). NUNCA concatenes otros atributos aquí.
- commonName: Nombre común en español de uso frecuente en Argentina / Sudamérica (ej: 'Limonero', 'Potus', 'Palta', 'Ficus').
- family: Familia botánica (ej: 'Rutaceae', 'Araceae', 'Lauraceae').
- confidence: Nivel de certeza entre 0.0 y 1.0.
- description: Breve descripción morfológica observable (máximo 2 oraciones).
- observedHealth: Observaciones visibles sobre la salud de las hojas/ramas (máximo 2 oraciones).
- alternativeCandidates: Hasta 3 especies visualmente similares si existen dudas.
Si NO es una planta o no se distingue vegetación, asigná isPlant = false.`;

    const requestPayload = {
      system_instruction: {
        parts: [{ text: systemPromptText }],
      },
      contents: [
        {
          parts: [
            { text: 'Identificá la especie botánica de esta planta.' },
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
                required: ['scientificName', 'commonName'],
              },
            },
            notes: { type: 'STRING' },
          },
          required: ['isPlant', 'scientificName', 'commonName'],
        },
      },
    };

    let lastError: string | null = null;

    for (const model of this.models) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
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
          let errMessage = `Error de API Gemini (${model}): HTTP ${response.status}`;
          try {
            const errData = await response.json();
            if (errData?.error?.message) {
              errMessage = errData.error.message;
            }
          } catch {
            // ignore
          }

          if (
            response.status === 503 ||
            response.status === 429 ||
            response.status === 404 ||
            response.status === 500 ||
            errMessage.includes('demand') ||
            errMessage.includes('quota')
          ) {
            lastError = errMessage;
            continue;
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
          lastError = 'No se recibió respuesta estructurada del modelo de IA.';
          continue;
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
          lastError = 'Formato de respuesta no válido recibido de la IA.';
          continue;
        }

        if (!parsed.isPlant) {
          return {
            success: true,
            isPlant: false,
            notes:
              parsed.notes || 'La imagen no parece ser una planta o árbol.',
          };
        }

        const sanitized = this.sanitizeCandidate(parsed);

        const primaryCandidate: PlantIdentificationCandidate = {
          scientificName: sanitized.scientificName,
          commonName: sanitized.commonName,
          confidence: sanitized.confidence,
          family: sanitized.family,
          description: sanitized.description,
          healthObservation: sanitized.observedHealth,
        };

        const alternativeCandidates: PlantIdentificationCandidate[] =
          Array.isArray(parsed.alternativeCandidates)
            ? parsed.alternativeCandidates
                .filter((c) => Boolean(c.scientificName || c.commonName))
                .map((c) => {
                  const s = this.sanitizeCandidate(c);
                  return {
                    scientificName: s.scientificName,
                    commonName: s.commonName,
                    confidence: s.confidence,
                  };
                })
            : [];

        return {
          success: true,
          isPlant: true,
          primaryCandidate,
          alternativeCandidates,
          observedHealth: sanitized.observedHealth,
          notes: parsed.notes?.trim() || null,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        const isAbort =
          err instanceof Error &&
          (err.name === 'AbortError' || err.message?.includes('aborted'));
        lastError = isAbort
          ? `Tiempo de espera agotado en modelo ${model}.`
          : 'Error de conexión con el servicio de IA.';
      }
    }

    const friendlyError =
      lastError?.includes('demand') || lastError?.includes('503')
        ? 'El servicio de IA está experimentando una alta demanda temporal. Por favor, reintentá en unos segundos.'
        : lastError || 'No se pudo conectar con el servicio de IA.';

    return {
      success: false,
      isPlant: false,
      error: friendlyError,
    };
  }
}
