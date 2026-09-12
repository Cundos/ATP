import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export async function seedHaBinding(prisma: PrismaClient) {
  const zzPlant = await prisma.plant.findUnique({
    where: { permanent_code: 'AT-PL-007' },
  });

  if (!zzPlant) {
    throw new Error('Plant AT-PL-007 not found');
  }

  const binding = await prisma.plantHomeAssistantBinding.upsert({
    where: { plant_id: zzPlant.id },
    create: {
      id: uuidv7(),
      plant_id: zzPlant.id,
      moisture_entity_id: 'sensor.humedad_suelo',
      battery_entity_id: 'sensor.bateria_sensor_humedad_beta',
      online_entity_id: 'binary_sensor.sensor_humedad_beta_online',
      stale_entity_id: 'binary_sensor.sensor_humedad_beta_lectura_desactualizada',
      visual_state_entity_id: 'sensor.humedad_suelo_estado_visual',
    },
    update: {
      moisture_entity_id: 'sensor.humedad_suelo',
      battery_entity_id: 'sensor.bateria_sensor_humedad_beta',
      online_entity_id: 'binary_sensor.sensor_humedad_beta_online',
      stale_entity_id: 'binary_sensor.sensor_humedad_beta_lectura_desactualizada',
      visual_state_entity_id: 'sensor.humedad_suelo_estado_visual',
    },
  });

  console.log('Home Assistant binding created/updated for AT-PL-007:', binding);
  return binding;
}

if (require.main === module || !process.env.VITEST) {
  const prisma = new PrismaClient();
  seedHaBinding(prisma)
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Error in seedHaBinding:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
