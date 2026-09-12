import { IPlantRepository, IPlantHomeAssistantBindingRepository } from '@/core/domain/repositories';
import { IHomeAssistantClient, HomeAssistantState } from '@/core/domain/services';
import { PlantEntity, PlantHomeAssistantBindingEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

export interface PlantLiveTelemetryMoisture {
  value: number | null;
  unit: string | null;
  visual_state: string | null;
  last_updated: string | null;
  available: boolean;
}

export interface PlantLiveTelemetryHardware {
  battery: number | null;
  online: boolean | null;
  stale: boolean | null;
  last_seen: string | null;
  available: boolean;
}

export interface PlantLiveTelemetryDTO {
  plant_id: string;
  permanent_code: string;
  binding_configured: boolean;
  available: boolean;
  moisture: PlantLiveTelemetryMoisture | null;
  hardware: PlantLiveTelemetryHardware | null;
  error_reason?: string | null;
}

export class GetPlantLiveTelemetryUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly haClient: IHomeAssistantClient,
    private readonly haBindingRepository?: IPlantHomeAssistantBindingRepository
  ) {}

  async executeByPlantId(plantId: string): Promise<PlantLiveTelemetryDTO> {
    if (!plantId || plantId.trim().length === 0) {
      throw new PlantValidationError('El id del ejemplar es obligatorio.');
    }

    const plant = await this.plantRepository.findById(plantId);
    if (!plant) {
      throw new PlantNotFoundError(plantId);
    }

    return this.execute(plant);
  }

  async executeByPermanentCode(permanentCode: string): Promise<PlantLiveTelemetryDTO> {
    if (!permanentCode || permanentCode.trim().length === 0) {
      throw new PlantValidationError('El código permanente es obligatorio.');
    }

    const plant = await this.plantRepository.findByPermanentCode(permanentCode.trim());
    if (!plant) {
      throw new PlantNotFoundError(permanentCode);
    }

    return this.execute(plant);
  }

  async execute(plant: PlantEntity): Promise<PlantLiveTelemetryDTO> {
    let binding: PlantHomeAssistantBindingEntity | null | undefined = plant.ha_binding;

    if (binding === undefined && this.haBindingRepository) {
      binding = await this.haBindingRepository.findByPlantId(plant.id);
    }

    if (!binding || (
      !binding.moisture_entity_id &&
      !binding.battery_entity_id &&
      !binding.online_entity_id &&
      !binding.stale_entity_id &&
      !binding.visual_state_entity_id
    )) {
      return {
        plant_id: plant.id,
        permanent_code: plant.permanent_code,
        binding_configured: false,
        available: false,
        moisture: null,
        hardware: null,
      };
    }

    const entityPromises: Record<string, Promise<HomeAssistantState> | null> = {
      moisture: binding.moisture_entity_id ? this.haClient.getState(binding.moisture_entity_id) : null,
      visual_state: binding.visual_state_entity_id ? this.haClient.getState(binding.visual_state_entity_id) : null,
      battery: binding.battery_entity_id ? this.haClient.getState(binding.battery_entity_id) : null,
      online: binding.online_entity_id ? this.haClient.getState(binding.online_entity_id) : null,
      stale: binding.stale_entity_id ? this.haClient.getState(binding.stale_entity_id) : null,
    };

    const results = await Promise.allSettled([
      entityPromises.moisture ? entityPromises.moisture : Promise.resolve(null),
      entityPromises.visual_state ? entityPromises.visual_state : Promise.resolve(null),
      entityPromises.battery ? entityPromises.battery : Promise.resolve(null),
      entityPromises.online ? entityPromises.online : Promise.resolve(null),
      entityPromises.stale ? entityPromises.stale : Promise.resolve(null),
    ]);

    const moistureRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const visualStateRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const batteryRes = results[2].status === 'fulfilled' ? results[2].value : null;
    const onlineRes = results[3].status === 'fulfilled' ? results[3].value : null;
    const staleRes = results[4].status === 'fulfilled' ? results[4].value : null;

    const allRejected = results.every((r) => r.status === 'rejected');
    if (allRejected && Object.values(entityPromises).some((p) => p !== null)) {
      return {
        plant_id: plant.id,
        permanent_code: plant.permanent_code,
        binding_configured: true,
        available: false,
        moisture: null,
        hardware: null,
        error_reason: 'Home Assistant no disponible',
      };
    }

    // Process Moisture
    let moistureDTO: PlantLiveTelemetryMoisture | null = null;
    if (binding.moisture_entity_id || binding.visual_state_entity_id) {
      let moistureVal: number | null = null;
      let moistureUnit: string | null = null;
      let lastUpdated: string | null = null;
      let isMoistureAvailable = false;

      if (moistureRes) {
        const rawState = moistureRes.state?.trim().toLowerCase();
        if (rawState !== 'unavailable' && rawState !== 'unknown' && rawState !== 'none' && rawState !== '') {
          const parsed = parseFloat(moistureRes.state);
          if (!isNaN(parsed)) {
            moistureVal = parsed;
            isMoistureAvailable = true;
          }
        }
        moistureUnit = moistureRes.unit || (moistureRes.attributes?.unit_of_measurement as string) || '%';
        lastUpdated = moistureRes.lastUpdated || moistureRes.lastChanged || null;
      }

      let visualStateVal: string | null = null;
      if (visualStateRes) {
        const rawVisual = visualStateRes.state?.trim().toLowerCase();
        if (rawVisual !== 'unavailable' && rawVisual !== 'unknown' && rawVisual !== 'none' && rawVisual !== '') {
          visualStateVal = visualStateRes.state;
          if (!lastUpdated) {
            lastUpdated = visualStateRes.lastUpdated || visualStateRes.lastChanged || null;
          }
          isMoistureAvailable = true;
        }
      }

      moistureDTO = {
        value: moistureVal,
        unit: moistureUnit,
        visual_state: visualStateVal,
        last_updated: lastUpdated,
        available: isMoistureAvailable,
      };
    }

    // Process Hardware
    let hardwareDTO: PlantLiveTelemetryHardware | null = null;
    if (binding.battery_entity_id || binding.online_entity_id || binding.stale_entity_id) {
      let batteryVal: number | null = null;
      let onlineVal: boolean | null = null;
      let staleVal: boolean | null = null;
      let lastSeen: string | null = null;
      let isHardwareAvailable = false;

      if (batteryRes) {
        const rawBattery = batteryRes.state?.trim().toLowerCase();
        if (rawBattery !== 'unavailable' && rawBattery !== 'unknown' && rawBattery !== 'none' && rawBattery !== '') {
          const parsed = parseFloat(batteryRes.state);
          if (!isNaN(parsed)) {
            batteryVal = parsed;
            isHardwareAvailable = true;
          }
        }
        if (batteryRes.lastUpdated) lastSeen = batteryRes.lastUpdated;
      }

      if (onlineRes) {
        const rawOnline = onlineRes.state?.trim().toLowerCase();
        if (rawOnline === 'on') {
          onlineVal = true;
          isHardwareAvailable = true;
        } else if (rawOnline === 'off') {
          onlineVal = false;
          isHardwareAvailable = true;
        }
        if (onlineRes.lastUpdated && (!lastSeen || new Date(onlineRes.lastUpdated) > new Date(lastSeen))) {
          lastSeen = onlineRes.lastUpdated;
        }
      }

      if (staleRes) {
        const rawStale = staleRes.state?.trim().toLowerCase();
        if (rawStale === 'on') {
          staleVal = true;
          isHardwareAvailable = true;
        } else if (rawStale === 'off') {
          staleVal = false;
          isHardwareAvailable = true;
        }
        if (staleRes.lastUpdated && (!lastSeen || new Date(staleRes.lastUpdated) > new Date(lastSeen))) {
          lastSeen = staleRes.lastUpdated;
        }
      }

      hardwareDTO = {
        battery: batteryVal,
        online: onlineVal,
        stale: staleVal,
        last_seen: lastSeen,
        available: isHardwareAvailable,
      };
    }

    const isAvailable = (moistureDTO?.available ?? false) || (hardwareDTO?.available ?? false);

    return {
      plant_id: plant.id,
      permanent_code: plant.permanent_code,
      binding_configured: true,
      available: isAvailable,
      moisture: moistureDTO,
      hardware: hardwareDTO,
      error_reason: isAvailable ? null : 'Lecturas de sensor no disponibles',
    };
  }
}
