import {
  IFileStorageService,
  IImageProcessingService,
  IOpenPlantbookClient,
  IPlantReferenceMapper,
  IOAuth2TokenManager,
  IHomeAssistantClient,
} from '../../core/domain/services';
import {
  IPlantReferenceRepository,
  IPlantRepository,
  IPlantHomeAssistantBindingRepository,
  IPlantOperationalEventRepository,
  IPhotoRepository,
  IRegionalFloraRepository,
  IEcologicalRegionRepository,
  IDataSourceRepository,
  IGrowingRegionRepository,
} from '../../core/domain/repositories';
import {
  GetOrCreatePlantReferenceUseCase,
  GetPlantLiveTelemetryUseCase,
  IngestHomeAssistantEventUseCase,
  GetPlantCareContextUseCase,
  GetSeasonalRegionalFloraUseCase,
  GetNativeRegionalFloraUseCase,
  GetRegionalGrowingContextUseCase,
} from '../../core/application';
import { createStorageService } from '../storage';
import { LazySharpImageProcessingService } from '../image/LazySharpImageProcessingService';
import { PrismaPlantReferenceRepository } from '../db/repositories/PrismaPlantReferenceRepository';
import { PrismaPlantRepository } from '../db/repositories/PrismaPlantRepository';
import { PrismaPlantHomeAssistantBindingRepository } from '../db/repositories/PrismaPlantHomeAssistantBindingRepository';
import { PrismaPlantOperationalEventRepository } from '../db/repositories/PrismaPlantOperationalEventRepository';
import { PrismaPhotoRepository } from '../db/repositories/PrismaPhotoRepository';
import {
  PrismaRegionalFloraRepository,
  PrismaEcologicalRegionRepository,
  PrismaDataSourceRepository,
  PrismaGrowingRegionRepository,
} from '../db/repositories/PrismaRegionalFloraRepository';
import { OpenPlantbookMapper } from '../open-plantbook/OpenPlantbookMapper';
import { OpenPlantbookClient } from '../open-plantbook/OpenPlantbookClient';
import { OAuth2TokenManager } from '../open-plantbook/OAuth2TokenManager';
import { HomeAssistantRestClient } from '../home-assistant/HomeAssistantRestClient';

let customFileStorageService: IFileStorageService | null = null;
let customImageProcessingService: IImageProcessingService | null = null;
let customPlantReferenceRepository: IPlantReferenceRepository | null = null;
let customPlantRepository: IPlantRepository | null = null;
let customPlantHomeAssistantBindingRepository: IPlantHomeAssistantBindingRepository | null = null;
let customPlantOperationalEventRepository: IPlantOperationalEventRepository | null = null;
let customPhotoRepository: IPhotoRepository | null = null;
let customPlantReferenceMapper: IPlantReferenceMapper | null = null;
let customOpenPlantbookClient: IOpenPlantbookClient | null = null;
let customOAuth2TokenManager: IOAuth2TokenManager | null = null;
let customHomeAssistantClient: IHomeAssistantClient | null = null;
let customRegionalFloraRepository: IRegionalFloraRepository | null = null;
let customEcologicalRegionRepository: IEcologicalRegionRepository | null = null;
let customDataSourceRepository: IDataSourceRepository | null = null;
let customGrowingRegionRepository: IGrowingRegionRepository | null = null;

export function setRegionalFloraRepository(repo: IRegionalFloraRepository | null): void {
  customRegionalFloraRepository = repo;
}

export function setEcologicalRegionRepository(repo: IEcologicalRegionRepository | null): void {
  customEcologicalRegionRepository = repo;
}

export function setDataSourceRepository(repo: IDataSourceRepository | null): void {
  customDataSourceRepository = repo;
}

export function setGrowingRegionRepository(repo: IGrowingRegionRepository | null): void {
  customGrowingRegionRepository = repo;
}

export function setFileStorageService(service: IFileStorageService | null): void {
  customFileStorageService = service;
}

export function setImageProcessingService(service: IImageProcessingService | null): void {
  customImageProcessingService = service;
}

export function setPlantReferenceRepository(repo: IPlantReferenceRepository | null): void {
  customPlantReferenceRepository = repo;
}

export function setPlantRepository(repo: IPlantRepository | null): void {
  customPlantRepository = repo;
}

export function setPlantHomeAssistantBindingRepository(repo: IPlantHomeAssistantBindingRepository | null): void {
  customPlantHomeAssistantBindingRepository = repo;
}

export function setPlantOperationalEventRepository(repo: IPlantOperationalEventRepository | null): void {
  customPlantOperationalEventRepository = repo;
}

export function setPhotoRepository(repo: IPhotoRepository | null): void {
  customPhotoRepository = repo;
}

export function setPlantReferenceMapper(mapper: IPlantReferenceMapper | null): void {
  customPlantReferenceMapper = mapper;
}

export function setOpenPlantbookClient(client: IOpenPlantbookClient | null): void {
  customOpenPlantbookClient = client;
}

export function setOAuth2TokenManager(manager: IOAuth2TokenManager | null): void {
  customOAuth2TokenManager = manager;
}

export function setHomeAssistantClient(client: IHomeAssistantClient | null): void {
  customHomeAssistantClient = client;
}

export function getFileStorageService(): IFileStorageService {
  if (customFileStorageService) {
    return customFileStorageService;
  }
  return createStorageService();
}

export function getImageProcessingService(): IImageProcessingService {
  if (customImageProcessingService) {
    return customImageProcessingService;
  }
  return new LazySharpImageProcessingService();
}

export function getPlantReferenceRepository(): IPlantReferenceRepository {
  if (customPlantReferenceRepository) {
    return customPlantReferenceRepository;
  }
  return new PrismaPlantReferenceRepository();
}

export function getPlantRepository(): IPlantRepository {
  if (customPlantRepository) {
    return customPlantRepository;
  }
  return new PrismaPlantRepository();
}

export function getPlantHomeAssistantBindingRepository(): IPlantHomeAssistantBindingRepository {
  if (customPlantHomeAssistantBindingRepository) {
    return customPlantHomeAssistantBindingRepository;
  }
  return new PrismaPlantHomeAssistantBindingRepository();
}

export function getPlantOperationalEventRepository(): IPlantOperationalEventRepository {
  if (customPlantOperationalEventRepository) {
    return customPlantOperationalEventRepository;
  }
  return new PrismaPlantOperationalEventRepository();
}

export function getPhotoRepository(): IPhotoRepository {
  if (customPhotoRepository) {
    return customPhotoRepository;
  }
  return new PrismaPhotoRepository();
}

export function getPlantReferenceMapper(): IPlantReferenceMapper {
  if (customPlantReferenceMapper) {
    return customPlantReferenceMapper;
  }
  return new OpenPlantbookMapper();
}

export function getOAuth2TokenManager(): IOAuth2TokenManager {
  if (customOAuth2TokenManager) {
    return customOAuth2TokenManager;
  }
  return new OAuth2TokenManager();
}

export function getOpenPlantbookClient(): IOpenPlantbookClient {
  if (customOpenPlantbookClient) {
    return customOpenPlantbookClient;
  }
  return new OpenPlantbookClient(getOAuth2TokenManager());
}

export function getHomeAssistantClient(): IHomeAssistantClient {
  if (customHomeAssistantClient) {
    return customHomeAssistantClient;
  }
  return new HomeAssistantRestClient();
}

export function getOrCreatePlantReferenceUseCase(): GetOrCreatePlantReferenceUseCase {
  return new GetOrCreatePlantReferenceUseCase(
    getPlantReferenceRepository(),
    getOpenPlantbookClient(),
    getPlantReferenceMapper()
  );
}

export function getPlantLiveTelemetryUseCase(): GetPlantLiveTelemetryUseCase {
  return new GetPlantLiveTelemetryUseCase(
    getPlantRepository(),
    getHomeAssistantClient(),
    getPlantHomeAssistantBindingRepository()
  );
}

export function getIngestHomeAssistantEventUseCase(): IngestHomeAssistantEventUseCase {
  return new IngestHomeAssistantEventUseCase(
    getPlantRepository(),
    getPlantOperationalEventRepository()
  );
}

export function getPlantCareContextUseCase(): GetPlantCareContextUseCase {
  return new GetPlantCareContextUseCase(
    getPlantRepository(),
    getPlantLiveTelemetryUseCase(),
    getPlantOperationalEventRepository(),
    getPhotoRepository()
  );
}

export function getRegionalFloraRepository(): IRegionalFloraRepository {
  if (customRegionalFloraRepository) {
    return customRegionalFloraRepository;
  }
  return new PrismaRegionalFloraRepository();
}

export function getEcologicalRegionRepository(): IEcologicalRegionRepository {
  if (customEcologicalRegionRepository) {
    return customEcologicalRegionRepository;
  }
  return new PrismaEcologicalRegionRepository();
}

export function getDataSourceRepository(): IDataSourceRepository {
  if (customDataSourceRepository) {
    return customDataSourceRepository;
  }
  return new PrismaDataSourceRepository();
}

export function getGrowingRegionRepository(): IGrowingRegionRepository {
  if (customGrowingRegionRepository) {
    return customGrowingRegionRepository;
  }
  return new PrismaGrowingRegionRepository();
}

export function getSeasonalRegionalFloraUseCase(): GetSeasonalRegionalFloraUseCase {
  return new GetSeasonalRegionalFloraUseCase(getRegionalFloraRepository());
}

export function getNativeRegionalFloraUseCase(): GetNativeRegionalFloraUseCase {
  return new GetNativeRegionalFloraUseCase(getRegionalFloraRepository());
}

export function getRegionalGrowingContextUseCase(): GetRegionalGrowingContextUseCase {
  return new GetRegionalGrowingContextUseCase(getGrowingRegionRepository());
}




