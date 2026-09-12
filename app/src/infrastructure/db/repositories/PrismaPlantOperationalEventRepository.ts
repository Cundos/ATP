import { prisma } from '../prisma';
import {
  IPlantOperationalEventRepository,
  CreatePlantOperationalEventPersistenceDTO,
} from '@/core/domain/repositories';
import { PlantOperationalEventEntity } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';
import { Prisma } from '@prisma/client';

export class PrismaPlantOperationalEventRepository
  implements IPlantOperationalEventRepository
{
  async findByEventKey(eventKey: string): Promise<PlantOperationalEventEntity | null> {
    const record = await prisma.plantOperationalEvent.findUnique({
      where: { event_key: eventKey },
    });
    return record as unknown as PlantOperationalEventEntity | null;
  }

  async create(dto: CreatePlantOperationalEventPersistenceDTO): Promise<PlantOperationalEventEntity> {
    const record = await prisma.plantOperationalEvent.create({
      data: {
        id: generateUUIDv7(),
        plant_id: dto.plant_id,
        source: dto.source || 'HOME_ASSISTANT',
        event_type: dto.event_type,
        event_key: dto.event_key,
        occurred_at: dto.occurred_at,
        received_at: dto.received_at || new Date(),
        value_number: dto.value_number !== undefined ? dto.value_number : null,
        value_text: dto.value_text !== undefined ? dto.value_text : null,
        unit: dto.unit !== undefined ? dto.unit : null,
        metadata: dto.metadata ? (dto.metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return record as unknown as PlantOperationalEventEntity;
  }

  async findRecentByPlantId(plantId: string, limit: number = 10): Promise<PlantOperationalEventEntity[]> {
    const records = await prisma.plantOperationalEvent.findMany({
      where: { plant_id: plantId },
      orderBy: { occurred_at: 'desc' },
      take: limit,
    });

    return records as unknown as PlantOperationalEventEntity[];
  }
}
