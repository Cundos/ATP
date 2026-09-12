import { IPlantRepository, IPlantOperationalEventRepository } from '@/core/domain/repositories';
import {
  PlantOperationalEventEntity,
  PlantOperationalEventType,
  ALLOWED_OPERATIONAL_EVENT_TYPES,
} from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

export interface IngestHomeAssistantEventCommand {
  event_id: string;
  permanent_code: string;
  event_type: string;
  occurred_at: string | Date;
  value?: number | string | null;
  unit?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IngestHomeAssistantEventResult {
  status: 'CREATED' | 'DUPLICATE';
  event: PlantOperationalEventEntity;
}

const ALLOWED_METADATA_KEYS = ['entity_id', 'state', 'automation_id', 'trigger'] as const;

export class IngestHomeAssistantEventUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly eventRepository: IPlantOperationalEventRepository
  ) {}

  async execute(command: IngestHomeAssistantEventCommand): Promise<IngestHomeAssistantEventResult> {
    if (!command.event_id || typeof command.event_id !== 'string' || command.event_id.trim().length === 0) {
      throw new PlantValidationError('El event_id es obligatorio.');
    }

    if (!command.permanent_code || typeof command.permanent_code !== 'string' || command.permanent_code.trim().length === 0) {
      throw new PlantValidationError('El código permanente es obligatorio.');
    }

    const trimmedEventType = (command.event_type || '').trim().toUpperCase() as PlantOperationalEventType;
    if (!ALLOWED_OPERATIONAL_EVENT_TYPES.includes(trimmedEventType)) {
      throw new PlantValidationError(
        `Tipo de evento no permitido: "${command.event_type}". Tipos válidos: ${ALLOWED_OPERATIONAL_EVENT_TYPES.join(', ')}`
      );
    }

    let occurredAtDate: Date;
    if (command.occurred_at instanceof Date) {
      occurredAtDate = command.occurred_at;
    } else if (typeof command.occurred_at === 'string' && command.occurred_at.trim().length > 0) {
      occurredAtDate = new Date(command.occurred_at);
    } else {
      throw new PlantValidationError('La fecha de ocurrencia (occurred_at) es obligatoria.');
    }

    if (isNaN(occurredAtDate.getTime())) {
      throw new PlantValidationError('La fecha de ocurrencia (occurred_at) no es una fecha válida.');
    }

    const normalizedCode = command.permanent_code.trim().toUpperCase();
    const plant = await this.plantRepository.findByPermanentCode(normalizedCode);
    if (!plant) {
      throw new PlantNotFoundError(normalizedCode);
    }

    const eventKey = `home-assistant:${command.event_id.trim()}`;

    // Verificar idempotencia
    const existing = await this.eventRepository.findByEventKey(eventKey);
    if (existing) {
      return {
        status: 'DUPLICATE',
        event: existing,
      };
    }

    // Parse values
    let valueNumber: number | null = null;
    let valueText: string | null = null;

    if (typeof command.value === 'number') {
      valueNumber = command.value;
    } else if (typeof command.value === 'string') {
      const parsed = parseFloat(command.value);
      if (!isNaN(parsed) && isFinite(parsed)) {
        valueNumber = parsed;
      }
      valueText = command.value;
    }

    // Sanitizar metadata (Allowlist estricta)
    let sanitizedMetadata: Record<string, unknown> | null = null;
    if (command.metadata && typeof command.metadata === 'object') {
      sanitizedMetadata = {};
      for (const key of ALLOWED_METADATA_KEYS) {
        if (key in command.metadata && command.metadata[key] !== undefined) {
          const val = command.metadata[key];
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null) {
            sanitizedMetadata[key] = val;
          }
        }
      }
      if (Object.keys(sanitizedMetadata).length === 0) {
        sanitizedMetadata = null;
      }
    }

    const created = await this.eventRepository.create({
      plant_id: plant.id,
      source: 'HOME_ASSISTANT',
      event_type: trimmedEventType,
      event_key: eventKey,
      occurred_at: occurredAtDate,
      received_at: new Date(),
      value_number: valueNumber,
      value_text: valueText,
      unit: command.unit?.trim() || null,
      metadata: sanitizedMetadata,
    });

    return {
      status: 'CREATED',
      event: created,
    };
  }
}
