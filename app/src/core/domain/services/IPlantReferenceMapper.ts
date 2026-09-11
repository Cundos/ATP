import { OpenPlantbookDetailResponse } from './IOpenPlantbookClient';
import { CreatePlantReferencePersistenceDTO } from '../repositories';

/**
 * Contract for mapping external Open Plantbook details into internal persistence DTOs.
 */
export interface IPlantReferenceMapper {
  toPersistenceDTO(
    detail: OpenPlantbookDetailResponse,
    timestamp?: Date
  ): CreatePlantReferencePersistenceDTO;
}
