import { IPlantReferenceRepository } from '../../domain/repositories';
import { IOpenPlantbookClient } from '../../domain/services/IOpenPlantbookClient';
import { IPlantReferenceMapper } from '../../domain/services/IPlantReferenceMapper';
import { PlantReferenceEntity, OPEN_PLANTBOOK_PROVIDER } from '../../domain/entities';
import { PlantReferenceValidationError } from '../errors';

export interface GetOrCreatePlantReferenceCommand {
  provider: string;
  external_id: string;
}

/**
 * GetOrCreatePlantReferenceUseCase
 *
 * Implements local-first retrieval and snapshot persistence for botanical reference data.
 * - If a reference exists locally in PostgreSQL for (provider, external_id), it is returned immediately
 *   without performing external network calls.
 * - If it does not exist, the external client is queried, mapped, persisted as a snapshot, and returned.
 */
export class GetOrCreatePlantReferenceUseCase {
  constructor(
    private readonly referenceRepo: IPlantReferenceRepository,
    private readonly openPlantbookClient: IOpenPlantbookClient,
    private readonly plantReferenceMapper: IPlantReferenceMapper,
    private readonly clock: () => Date = () => new Date()
  ) {}

  async execute(command: GetOrCreatePlantReferenceCommand): Promise<PlantReferenceEntity> {
    if (!command.provider || command.provider.trim().length === 0) {
      throw new PlantReferenceValidationError('El proveedor (provider) es obligatorio.');
    }

    if (!command.external_id || command.external_id.trim().length === 0) {
      throw new PlantReferenceValidationError('El identificador externo (external_id / pid) es obligatorio.');
    }

    const provider = command.provider.trim().toUpperCase();
    const externalId = command.external_id.trim();

    // 1. Local-First check: Return existing snapshot if already downloaded
    const existing = await this.referenceRepo.findByProviderAndExternalId(
      provider,
      externalId
    );

    if (existing) {
      return existing;
    }

    // 2. Query external provider
    if (provider !== OPEN_PLANTBOOK_PROVIDER) {
      throw new PlantReferenceValidationError(
        `Proveedor botánico no soportado: "${provider}". Solo se admite "${OPEN_PLANTBOOK_PROVIDER}".`
      );
    }

    const detailResponse = await this.openPlantbookClient.getPlantDetail(externalId);

    // 3. Map to persistence DTO
    const persistenceDto = this.plantReferenceMapper.toPersistenceDTO(
      detailResponse,
      this.clock()
    );

    // 4. Persist and return snapshot
    const created = await this.referenceRepo.create(persistenceDto);
    return created;
  }
}
