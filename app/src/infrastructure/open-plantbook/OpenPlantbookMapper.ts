import { IPlantReferenceMapper } from '../../core/domain/services/IPlantReferenceMapper';
import { OpenPlantbookDetailResponse } from '../../core/domain/services/IOpenPlantbookClient';
import { CreatePlantReferencePersistenceDTO } from '../../core/domain/repositories';
import { OPEN_PLANTBOOK_PROVIDER } from '../../core/domain/entities';

export { OPEN_PLANTBOOK_PROVIDER };

/**
 * OpenPlantbookMapper
 *
 * Pure mapper converting Open Plantbook external detail responses into
 * internal domain/persistence DTOs without performing side effects,
 * network calls or database mutations.
 */
export class OpenPlantbookMapper implements IPlantReferenceMapper {
  /**
   * Instance method implementing IPlantReferenceMapper contract.
   */
  toPersistenceDTO(
    detail: OpenPlantbookDetailResponse,
    timestamp: Date = new Date()
  ): CreatePlantReferencePersistenceDTO {
    return OpenPlantbookMapper.toPersistenceDTO(detail, timestamp);
  }

  /**
   * Static convenience method for mapping without instantiating.
   */
  static toPersistenceDTO(
    detail: OpenPlantbookDetailResponse,
    timestamp: Date = new Date()
  ): CreatePlantReferencePersistenceDTO {
    const data = detail.data;

    // 1. External ID (pid)
    const external_id = data.pid.trim();

    // 2. Scientific / display name
    const scientific_name =
      typeof data.display_pid === 'string' && data.display_pid.trim().length > 0
        ? data.display_pid.trim()
        : external_id;

    // 3. Common names list parsed from alias
    let common_names: string[] | null = null;
    if (typeof data.alias === 'string' && data.alias.trim().length > 0) {
      const parsed = data.alias
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (parsed.length > 0) {
        common_names = parsed;
      }
    }

    // 4. Image URL
    const image_url =
      typeof data.image_url === 'string' && data.image_url.trim().length > 0
        ? data.image_url.trim()
        : null;

    // 5. Reference Care structured object
    const reference_care: Record<string, unknown> = {
      min_temp: data.min_temp ?? null,
      max_temp: data.max_temp ?? null,
      min_light_lux: data.min_light_lux ?? null,
      max_light_lux: data.max_light_lux ?? null,
      min_soil_moist: data.min_soil_moist ?? null,
      max_soil_moist: data.max_soil_moist ?? null,
      min_soil_ec: data.min_soil_ec ?? null,
      max_soil_ec: data.max_soil_ec ?? null,
      min_env_humid: data.min_env_humid ?? null,
      max_env_humid: data.max_env_humid ?? null,
      watering: data.watering ?? null,
      sunlight: data.sunlight ?? null,
      soil: data.soil ?? null,
      pruning: data.pruning ?? null,
      fertilization: data.fertilization ?? null,
    };

    // 6. Raw Data payload
    const raw_data =
      typeof detail.raw === 'object' && detail.raw !== null
        ? (detail.raw as Record<string, unknown>)
        : {};

    return {
      provider: OPEN_PLANTBOOK_PROVIDER,
      external_id,
      scientific_name,
      common_names,
      reference_care,
      image_url,
      fetched_at: timestamp,
      last_sync_at: timestamp,
      raw_data,
    };
  }
}
