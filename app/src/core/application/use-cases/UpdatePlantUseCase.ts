import { IPlantRepository } from '@/core/domain/repositories';
import { PlantEntity, HealthStatus } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

export interface UpdatePlantCommand {
  common_name?: string;
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
 * Permite actualizar exclusivamente atributos mutables de un ejemplar.
 * PROHIBIDO modificar: id, permanent_code, created_at, lifecycle_status.
 */
export class UpdatePlantUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async execute(id: string, command: UpdatePlantCommand): Promise<PlantEntity> {
    if (!id || id.trim().length === 0) {
      throw new PlantValidationError('El id del ejemplar es obligatorio.');
    }

    // 1. Comprobar existencia previa de la planta
    const existingPlant = await this.plantRepository.findById(id);
    if (!existingPlant) {
      throw new PlantNotFoundError(id);
    }

    // 2. Validar common_name si fue proporcionado
    if (command.common_name !== undefined) {
      if (command.common_name.trim().length === 0) {
        throw new PlantValidationError('El nombre común (common_name) no puede quedar vacío.');
      }
    }

    // 3. Filtrar explícitamente solo atributos mutables aprobados
    return this.plantRepository.update(id, {
      common_name: command.common_name !== undefined ? command.common_name.trim() : undefined,
      scientific_name: command.scientific_name !== undefined ? (command.scientific_name?.trim() || null) : undefined,
      cultivar: command.cultivar !== undefined ? (command.cultivar?.trim() || null) : undefined,
      health_status: command.health_status,
      acquisition_date: command.acquisition_date,
      notes: command.notes !== undefined ? (command.notes?.trim() || null) : undefined,
      location_id: command.location_id,
      reference_id: command.reference_id,
      pot_info: command.pot_info !== undefined ? (command.pot_info?.trim() || null) : undefined,
      substrate_info: command.substrate_info !== undefined ? (command.substrate_info?.trim() || null) : undefined,
      light_conditions: command.light_conditions !== undefined ? (command.light_conditions?.trim() || null) : undefined,
      watering_notes: command.watering_notes !== undefined ? (command.watering_notes?.trim() || null) : undefined,
    });
  }
}