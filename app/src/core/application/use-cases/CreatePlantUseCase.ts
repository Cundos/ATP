import { IPlantRepository } from '@/core/domain/repositories';
import { PlantEntity, HealthStatus } from '@/core/domain/entities';
import { formatPermanentCode } from '@/core/domain/permanent-code';
import { PlantValidationError } from '../errors';

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
 * APPLICATION LAYER (ATP-IMP-008):
 * Valida datos de entrada, coordina la obtención atómica de la secuencia,
 * formatea permanent_code según dominio (AT-PL-XXX) y persiste mediante IPlantRepository.
 */
export class CreatePlantUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async execute(command: CreatePlantCommand): Promise<PlantEntity> {
    // 1. Validar que common_name sea obligatorio y no vacío/espacios
    if (!command.common_name || command.common_name.trim().length === 0) {
      throw new PlantValidationError('El nombre común (common_name) es obligatorio y no puede estar vacío.');
    }

    const trimmedCommonName = command.common_name.trim();

    // 2. Solicita el siguiente valor numérico atómico a la persistencia (nextval)
    const sequenceValue = await this.plantRepository.getNextSequenceValue();

    // 3. Llama a la función pura de dominio para formatear AT-PL-XXX con padding mínimo de 3 dígitos
    const permanent_code = formatPermanentCode(sequenceValue);

    // 4. Persiste el ejemplar mediante el repositorio aplicando defaults canónicos
    return this.plantRepository.create({
      ...command,
      common_name: trimmedCommonName,
      permanent_code,
      health_status: command.health_status || 'UNKNOWN',
      acquisition_date: command.acquisition_date !== undefined ? command.acquisition_date : null,
      location_id: command.location_id !== undefined ? command.location_id : null,
      reference_id: command.reference_id !== undefined ? command.reference_id : null,
    });
  }
}