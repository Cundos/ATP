import 'dotenv/config';
import { describe, it } from 'vitest';
import { HomeAssistantRestClient } from '../HomeAssistantRestClient';

describe('Home Assistant Real Smoke Test (Server-Side)', () => {
  it('attempts to query sensor.humedad_suelo_palta against configured Home Assistant instance', async () => {
    const baseUrl = process.env.HOME_ASSISTANT_BASE_URL;
    const token = process.env.HOME_ASSISTANT_TOKEN;

    if (!baseUrl || !token) {
      console.log('[HA Smoke] Skipped live request: HOME_ASSISTANT_BASE_URL / TOKEN not set');
      return;
    }

    const client = new HomeAssistantRestClient(baseUrl, token, 8000);
    const entityId = 'sensor.humedad_suelo_palta';

    try {
      console.log(`[HA Smoke] Sending live request for entity: ${entityId} to ${baseUrl.replace(/(:\/\/).+(@)/, '$1***$2')}...`);
      const state = await client.getState(entityId);
      console.log('[HA Smoke] Live response received successfully:');
      console.log('[HA Smoke] Sanitized DTO:', JSON.stringify(state, null, 2));
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`[HA Smoke] Live endpoint response: ${error.name} - ${error.message}`);
      // Do not fail automated builds if live HA instance is unreachable / in reboot
    }
  });

  it('attempts to query full live telemetry for specimen AT-PL-007 (Zamioculca)', async () => {
    const baseUrl = process.env.HOME_ASSISTANT_BASE_URL;
    const token = process.env.HOME_ASSISTANT_TOKEN;

    if (!baseUrl || !token) {
      console.log('[HA Smoke AT-PL-007] Skipped: HOME_ASSISTANT_BASE_URL / TOKEN not set');
      return;
    }

    try {
      const { getPlantLiveTelemetryUseCase } = await import('../../services/serviceContainer');
      const useCase = getPlantLiveTelemetryUseCase();
      const telemetry = await useCase.executeByPermanentCode('AT-PL-007');
      console.log('[HA Smoke AT-PL-007] Live Telemetry Result:');
      console.log(JSON.stringify(telemetry, null, 2));
    } catch (err: unknown) {
      const error = err as Error;
      console.log(`[HA Smoke AT-PL-007] Response: ${error.name} - ${error.message}`);
    }
  });
});

