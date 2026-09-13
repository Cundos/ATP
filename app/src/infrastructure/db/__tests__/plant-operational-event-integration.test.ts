import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { prisma } from '../prisma';
import { PrismaPlantOperationalEventRepository } from '../repositories/PrismaPlantOperationalEventRepository';
import { PrismaPlantRepository } from '../repositories/PrismaPlantRepository';

describe('PrismaPlantOperationalEventRepository Integration (ATP-HA-003)', () => {
  const eventRepo = new PrismaPlantOperationalEventRepository();
  const plantRepo = new PrismaPlantRepository();

  let testPlantId: string;
  const testEventKey1 = `test-ha-event-${Date.now()}-1`;
  const testEventKey2 = `test-ha-event-${Date.now()}-2`;

  beforeAll(async () => {
    const plant = await plantRepo.findByPermanentCode('AT-PL-007');
    expect(plant).not.toBeNull();
    testPlantId = plant!.id;
  });

  afterAll(async () => {
    await prisma.plantOperationalEvent.deleteMany({
      where: {
        event_key: {
          in: [testEventKey1, testEventKey2],
        },
      },
    });
    await prisma.$disconnect();
  });

  it('persists a new operational event and retrieves it by event_key', async () => {
    const created = await eventRepo.create({
      plant_id: testPlantId,
      source: 'HOME_ASSISTANT',
      event_type: 'SOIL_MOISTURE_LOW',
      event_key: testEventKey1,
      occurred_at: new Date(Date.now() - 60000),
      value_number: 12.8,
      value_text: '12.8',
      unit: '%',
      metadata: { entity_id: 'sensor.humedad_suelo', state: '12.8' },
    });

    expect(created.id).toBeDefined();
    expect(created.plant_id).toBe(testPlantId);
    expect(created.event_type).toBe('SOIL_MOISTURE_LOW');
    expect(created.value_number).toBe(12.8);

    const retrieved = await eventRepo.findByEventKey(testEventKey1);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.metadata).toEqual({ entity_id: 'sensor.humedad_suelo', state: '12.8' });
  });

  it('enforces unique constraint on event_key at engine level', async () => {
    await expect(
      eventRepo.create({
        plant_id: testPlantId,
        source: 'HOME_ASSISTANT',
        event_type: 'SOIL_MOISTURE_LOW',
        event_key: testEventKey1,
        occurred_at: new Date(Date.now() - 30000),
      })
    ).rejects.toThrow();
  });

  it('retrieves recent events ordered descending by occurred_at', async () => {
    await eventRepo.create({
      plant_id: testPlantId,
      source: 'HOME_ASSISTANT',
      event_type: 'SENSOR_ONLINE',
      event_key: testEventKey2,
      occurred_at: new Date(),
    });

    const recent = await eventRepo.findRecentByPlantId(testPlantId, 50);
    expect(recent.length).toBeGreaterThanOrEqual(2);

    const key2Index = recent.findIndex((e) => e.event_key === testEventKey2);
    const key1Index = recent.findIndex((e) => e.event_key === testEventKey1);

    expect(key2Index).toBeLessThan(key1Index);
  });
});
