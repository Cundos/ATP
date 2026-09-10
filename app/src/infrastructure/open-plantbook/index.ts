import 'server-only';
import { OpenPlantbookClient } from './OpenPlantbookClient';
import { getOpenPlantbookTokenManager } from './OAuth2TokenManager';
import { IOpenPlantbookClient } from '../../core/domain/services/IOpenPlantbookClient';

export * from './OAuth2TokenManager';
export * from './OpenPlantbookClient';

let _clientInstance: IOpenPlantbookClient | null = null;

/**
 * Returns a shared OpenPlantbookClient instance wired with the default OAuth2TokenManager.
 */
export function getOpenPlantbookClient(): IOpenPlantbookClient {
  if (_clientInstance === null) {
    _clientInstance = new OpenPlantbookClient(getOpenPlantbookTokenManager());
  }
  return _clientInstance;
}
