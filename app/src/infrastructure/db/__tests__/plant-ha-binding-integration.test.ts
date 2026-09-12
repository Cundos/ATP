import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { PrismaPlantHomeAssistantBindingRepository } from '../repositories/PrismaPlantHomeAssistantBindingRepository';
import { PrismaPlantRepository } from '../repositories/PrismaPlantRepository';

describe('PrismaPlantHomeAssistantBindingRepository Integration (ATP-HA-002)', () => {
  const bindingRepo = new PrismaPlantHomeAssistantBindingRepository();
  const plantRepo = new PrismaPlantRepository();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('can query the live binding for AT-PL-007 by plantId and permanentCode', async () => {
    const plant = await plantRepo.findByPermanentCode('AT-PL-007');
    expect(plant).not.toBeNull();
    expect(plant?.ha_binding).toBeDefined();
    expect(plant?.ha_binding?.moisture_entity_id).toBe('sensor.humedad_suelo');
    expect(plant?.ha_binding?.battery_entity_id).toBe('sensor.bateria_sensor_humedad_beta');
    expect(plant?.ha_binding?.online_entity_id).toBe('binary_sensor.sensor_humedad_beta_online');
    expect(plant?.ha_binding?.stale_entity_id).toBe('binary_sensor.sensor_humedad_beta_lectura_desactualizada');
    expect(plant?.ha_binding?.visual_state_entity_id).toBe('sensor.humedad_suelo_estado_visual');

    const bindingByPlantId = await bindingRepo.findByPlantId(plant!.id);
    expect(bindingByPlantId).not.toBeNull();
    expect(bindingByPlantId?.moisture_entity_id).toBe('sensor.humedad_suelo');

    const bindingByCode = await bindingRepo.findByPermanentCode('AT-PL-007');
    expect(bindingByCode).not.toBeNull();
    expect(bindingByCode?.plant_id).toBe(plant!.id);
  });
});
