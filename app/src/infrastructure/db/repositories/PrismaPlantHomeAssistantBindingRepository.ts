import { prisma } from '../prisma';
import {
  IPlantHomeAssistantBindingRepository,
  UpsertPlantHomeAssistantBindingDTO,
} from '@/core/domain/repositories';
import { PlantHomeAssistantBindingEntity } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaPlantHomeAssistantBindingRepository
  implements IPlantHomeAssistantBindingRepository
{
  async findByPlantId(plantId: string): Promise<PlantHomeAssistantBindingEntity | null> {
    const record = await prisma.plantHomeAssistantBinding.findUnique({
      where: { plant_id: plantId },
    });
    return record as unknown as PlantHomeAssistantBindingEntity | null;
  }

  async findByPermanentCode(permanentCode: string): Promise<PlantHomeAssistantBindingEntity | null> {
    const plant = await prisma.plant.findUnique({
      where: { permanent_code: permanentCode },
      select: {
        ha_binding: true,
      },
    });
    return (plant?.ha_binding as unknown as PlantHomeAssistantBindingEntity) || null;
  }

  async upsert(dto: UpsertPlantHomeAssistantBindingDTO): Promise<PlantHomeAssistantBindingEntity> {
    const record = await prisma.plantHomeAssistantBinding.upsert({
      where: { plant_id: dto.plant_id },
      create: {
        id: generateUUIDv7(),
        plant_id: dto.plant_id,
        moisture_entity_id: dto.moisture_entity_id ?? null,
        battery_entity_id: dto.battery_entity_id ?? null,
        online_entity_id: dto.online_entity_id ?? null,
        stale_entity_id: dto.stale_entity_id ?? null,
        visual_state_entity_id: dto.visual_state_entity_id ?? null,
      },
      update: {
        moisture_entity_id: dto.moisture_entity_id !== undefined ? dto.moisture_entity_id : undefined,
        battery_entity_id: dto.battery_entity_id !== undefined ? dto.battery_entity_id : undefined,
        online_entity_id: dto.online_entity_id !== undefined ? dto.online_entity_id : undefined,
        stale_entity_id: dto.stale_entity_id !== undefined ? dto.stale_entity_id : undefined,
        visual_state_entity_id: dto.visual_state_entity_id !== undefined ? dto.visual_state_entity_id : undefined,
      },
    });

    return record as unknown as PlantHomeAssistantBindingEntity;
  }

  async deleteByPlantId(plantId: string): Promise<void> {
    await prisma.plantHomeAssistantBinding.deleteMany({
      where: { plant_id: plantId },
    });
  }
}
