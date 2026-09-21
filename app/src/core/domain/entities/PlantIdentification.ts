export interface PlantIdentificationCandidate {
  scientificName: string;
  commonName: string;
  confidence: number; // 0.0 to 1.0
  family?: string | null;
  description?: string | null;
  healthObservation?: string | null;
}

export interface PlantIdentificationResult {
  success: boolean;
  isPlant: boolean;
  primaryCandidate?: PlantIdentificationCandidate | null;
  alternativeCandidates?: PlantIdentificationCandidate[];
  observedHealth?: string | null;
  notes?: string | null;
  error?: string | null;
}

export interface IPlantIdentificationService {
  identifyPlant(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<PlantIdentificationResult>;
}
