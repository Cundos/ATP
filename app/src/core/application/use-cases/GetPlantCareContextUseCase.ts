import {
  IPlantRepository,
  IPlantOperationalEventRepository,
  IPhotoRepository,
} from '../../domain/repositories';
import { PlantEntity, PlantCareContextDTO } from '../../domain/entities';
import { evaluatePlantCareContext } from '../../domain/services';
import { GetPlantLiveTelemetryUseCase, PlantLiveTelemetryDTO } from './GetPlantLiveTelemetryUseCase';
import { PlantNotFoundError, PlantValidationError } from '../errors';

export class GetPlantCareContextUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly getPlantLiveTelemetryUseCase?: GetPlantLiveTelemetryUseCase,
    private readonly operationalEventRepository?: IPlantOperationalEventRepository,
    private readonly photoRepository?: IPhotoRepository
  ) {}

  async executeByPlantId(plantId: string): Promise<PlantCareContextDTO> {
    if (!plantId || plantId.trim().length === 0) {
      throw new PlantValidationError('El id del ejemplar es obligatorio.');
    }

    const plant = await this.plantRepository.findById(plantId);
    if (!plant) {
      throw new PlantNotFoundError(plantId);
    }

    return this.execute(plant);
  }

  async executeByPermanentCode(permanentCode: string): Promise<PlantCareContextDTO> {
    if (!permanentCode || permanentCode.trim().length === 0) {
      throw new PlantValidationError('El código permanente es obligatorio.');
    }

    const plant = await this.plantRepository.findByPermanentCode(permanentCode.trim());
    if (!plant) {
      throw new PlantNotFoundError(permanentCode);
    }

    return this.execute(plant);
  }

  async execute(plant: PlantEntity): Promise<PlantCareContextDTO> {
    let telemetry: PlantLiveTelemetryDTO | null = null;
    if (this.getPlantLiveTelemetryUseCase) {
      try {
        telemetry = await this.getPlantLiveTelemetryUseCase.execute(plant);
      } catch {
        telemetry = null;
      }
    }

    let recentEvents: import('../../domain/entities').PlantOperationalEventEntity[] = [];
    if (this.operationalEventRepository) {
      try {
        recentEvents = await this.operationalEventRepository.findRecentByPlantId(plant.id, 10);
      } catch {
        recentEvents = [];
      }
    }

    let latestPhoto: import('../../domain/entities').PhotoEntity | null = null;
    if (this.photoRepository) {
      try {
        latestPhoto = await this.photoRepository.findPrimaryByPlant(plant.id);
        if (!latestPhoto) {
          const photos = await this.photoRepository.listByPlant(plant.id);
          if (photos.length > 0) {
            latestPhoto = photos[0];
          }
        }
      } catch {
        latestPhoto = null;
      }
    }

    return evaluatePlantCareContext({
      plant,
      telemetry,
      reference: plant.reference,
      recentEvents,
      latestPhoto,
    });
  }
}
