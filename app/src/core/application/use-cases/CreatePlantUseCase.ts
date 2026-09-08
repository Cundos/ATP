import { IPlantRepository } from '@/core/domain/repositories';
import { PlantEntity, HealthStatus } from '@/core/domain/entities';
import { formatPermanentCode } from '@/core/domain/permanent-code';

export interface CreatePlantCommand {
  common_name: string;
  scientific_name?: string | null;
  cultivar?: string | null;
  health_status?: HealthStatus;
  acquisition_date?: Date | null;
  notes?: string | null;
  location_id?: string | null;
  reference_id?: string | null;
  pot_info?: string | null;
  substrate_info?: string | null;
  light_conditions?: string | null;
  watering_notes?: string | null;
}

/**
 * APPLICATION LAYER (ATP-IMP-004):
 * Coordina la obtención atómica del número de secuencia desde la persistencia,
 * invoca el formateo de dominio a AT-PL-XXX y persiste la entidad mediante el repositorio.
 */
export class CreatePlantUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async execute(command: CreatePlantCommand): Promise<PlantEntity> {
    // 1. Solicita el siguiente valor numérico atómico a la persistencia (nextval)
    const sequenceValue = await this.plantRepository.getNextSequenceValue();

    // 2. Llama a la función pura de dominio para formatear AT-PL-XXX con padding mínimo de 3 dígitos
    const permanent_code = formatPermanentCode(sequenceValue);

    // 3. Persiste el ejemplar mediante el repositorio
    return this.plantRepository.create({
      ...command,
      permanent_code,
    });
  }
}