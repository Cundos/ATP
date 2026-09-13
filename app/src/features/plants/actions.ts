'use server';

import { revalidatePath } from 'next/cache';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { PrismaPhotoRepository } from '@/infrastructure/db/repositories/PrismaPhotoRepository';
import { CreatePlantUseCase } from '@/core/application/use-cases/CreatePlantUseCase';
import { UpdatePlantUseCase } from '@/core/application/use-cases/UpdatePlantUseCase';
import { ArchivePlantUseCase } from '@/core/application/use-cases/ArchivePlantUseCase';
import { RestorePlantUseCase } from '@/core/application/use-cases/RestorePlantUseCase';
import { SetPrimaryPhotoUseCase } from '@/core/application/use-cases/SetPrimaryPhotoUseCase';
import { UpdatePlantPhotoMetadataUseCase } from '@/core/application/use-cases/UpdatePlantPhotoMetadataUseCase';
import { DeletePlantPhotoUseCase } from '@/core/application/use-cases/DeletePlantPhotoUseCase';
import { PlantFormInputSchema, PlantFormRawInput } from './schemas/plant-form.schema';
import { uploadAndRegisterPlantPhoto } from './server/photo-service';
import {
  getOrCreatePlantReferenceUseCase,
  getFileStorageService,
} from '@/infrastructure/services/serviceContainer';
import { mapActionError } from '@/core/application/error-handler';

export interface PlantActionResult {
  success: boolean;
  permanent_code?: string;
  message?: string;
  errors?: Record<string, string>;
}

/**
 * SERVER ACTION: Alta de Planta (SCR-004)
 * Parsea FormData, valida con Zod, comprueba validez de Location ACTIVE,
 * resuelve PlantReference opcional, ejecuta CreatePlantUseCase, procesa foto opcional y revalida los paths afectados.
 */
export async function createPlantAction(
  _prevState: PlantActionResult | null,
  formData: FormData
): Promise<PlantActionResult> {
  try {
    const rawData: PlantFormRawInput = {
      common_name: (formData.get('common_name') as string) || '',
      scientific_name: (formData.get('scientific_name') as string) || '',
      cultivar: (formData.get('cultivar') as string) || '',
      health_status: (formData.get('health_status') as string) || 'UNKNOWN',
      acquisition_date: (formData.get('acquisition_date') as string) || '',
      location_id: (formData.get('location_id') as string) || '',
      notes: (formData.get('notes') as string) || '',
      pot_info: (formData.get('pot_info') as string) || '',
      substrate_info: (formData.get('substrate_info') as string) || '',
      light_conditions: (formData.get('light_conditions') as string) || '',
      watering_notes: (formData.get('watering_notes') as string) || '',
      selected_pid: (formData.get('selected_pid') as string) || '',
    };

    // 1. Validación de esquema con Zod
    const validationResult = PlantFormInputSchema.safeParse(rawData);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as string;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      return {
        success: false,
        errors: fieldErrors,
        message: 'Por favor corregí los campos marcados.',
      };
    }

    const validatedData = validationResult.data;

    // 2. Validación de Location (debe existir y estar ACTIVE)
    if (validatedData.location_id) {
      const locationRepository = new PrismaLocationRepository();
      const location = await locationRepository.findById(validatedData.location_id);
      if (!location || location.lifecycle_status !== 'ACTIVE') {
        return {
          success: false,
          errors: {
            location_id: 'La ubicación seleccionada no es válida o se encuentra archivada.',
          },
          message: 'Ubicación no disponible para nueva asignación.',
        };
      }
    }

    // 3. Resolución opcional de Referencia Botánica (Open Plantbook snapshot)
    let referenceId: string | null = null;
    let referenceMessage = '';
    if (validatedData.selected_pid) {
      try {
        const getOrCreatePlantReference = getOrCreatePlantReferenceUseCase();
        const reference = await getOrCreatePlantReference.execute({
          provider: 'OPEN_PLANTBOOK',
          external_id: validatedData.selected_pid,
        });
        referenceId = reference.id;
      } catch (refError) {
        console.error('[createPlantAction] Error al resolver referencia botánica:', refError);
        referenceMessage = ' (No pudimos vincular la referencia botánica; podés agregarla luego desde edición).';
      }
    }

    // 4. Ejecución del Caso de Uso de creación de Planta
    const plantRepository = new PrismaPlantRepository();
    const createPlantUseCase = new CreatePlantUseCase(plantRepository);

    const createdPlant = await createPlantUseCase.execute({
      common_name: validatedData.common_name,
      scientific_name: validatedData.scientific_name,
      cultivar: validatedData.cultivar,
      health_status: validatedData.health_status,
      acquisition_date: validatedData.acquisition_date,
      location_id: validatedData.location_id,
      reference_id: referenceId,
      notes: validatedData.notes,
      pot_info: validatedData.pot_info,
      substrate_info: validatedData.substrate_info,
      light_conditions: validatedData.light_conditions,
      watering_notes: validatedData.watering_notes,
    });

    // 5. Procesamiento opcional de fotografía inicial
    const photoFile = formData.get('photo') as File | null;
    let photoMessage = '';
    if (photoFile && typeof photoFile === 'object' && 'size' in photoFile && photoFile.size > 0) {
      try {
        const fileBuffer = Buffer.from(await photoFile.arrayBuffer());
        await uploadAndRegisterPlantPhoto({
          plantId: createdPlant.id,
          permanentCode: createdPlant.permanent_code,
          fileBuffer,
          fileName: photoFile.name,
          makePrimary: true,
        });
      } catch (photoError) {
        console.error('[createPlantAction] Error al procesar fotografía inicial:', photoError);
        photoMessage = ' (La foto no pudo guardarse, podés agregarla luego desde edición).';
      }
    }

    // 6. Revalidar cache de Next.js
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath(`/plants/${createdPlant.permanent_code}`);

    return {
      success: true,
      permanent_code: createdPlant.permanent_code,
      message: `Planta registrada correctamente${referenceMessage}${photoMessage}`,
    };
  } catch (error: unknown) {
    return mapActionError(error, 'Algo salió mal al guardar los cambios.');
  }
}

/**
 * SERVER ACTION: Edición de Planta (SCR-005)
 * Parsea FormData, valida con Zod, comprueba validez de Location ACTIVE (si fue modificada),
 * ejecuta UpdatePlantUseCase, procesa nueva foto si fue enviada y revalida los paths afectados.
 */
export async function updatePlantAction(
  plantId: string,
  _prevState: PlantActionResult | null,
  formData: FormData
): Promise<PlantActionResult> {
  try {
    if (!plantId || plantId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ejemplar no proporcionado.',
      };
    }

    const rawData: PlantFormRawInput = {
      common_name: (formData.get('common_name') as string) || '',
      scientific_name: (formData.get('scientific_name') as string) || '',
      cultivar: (formData.get('cultivar') as string) || '',
      health_status: (formData.get('health_status') as string) || 'UNKNOWN',
      acquisition_date: (formData.get('acquisition_date') as string) || '',
      location_id: (formData.get('location_id') as string) || '',
      notes: (formData.get('notes') as string) || '',
      pot_info: (formData.get('pot_info') as string) || '',
      substrate_info: (formData.get('substrate_info') as string) || '',
      light_conditions: (formData.get('light_conditions') as string) || '',
      watering_notes: (formData.get('watering_notes') as string) || '',
      selected_pid: (formData.get('selected_pid') as string) || '',
      clear_reference: formData.get('clear_reference') as string | null,
    };

    // 1. Validación de esquema con Zod
    const validationResult = PlantFormInputSchema.safeParse(rawData);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as string;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      return {
        success: false,
        errors: fieldErrors,
        message: 'Por favor corregí los campos marcados.',
      };
    }

    const validatedData = validationResult.data;

    // 2. Validación de Location (si se asigna una nueva, debe existir y estar ACTIVE)
    if (validatedData.location_id) {
      const locationRepository = new PrismaLocationRepository();
      const location = await locationRepository.findById(validatedData.location_id);
      if (!location || location.lifecycle_status !== 'ACTIVE') {
        return {
          success: false,
          errors: {
            location_id: 'La ubicación seleccionada no es válida o se encuentra archivada.',
          },
          message: 'Ubicación no disponible para asignación.',
        };
      }
    }

    // 3. Resolución opcional de Referencia Botánica (Open Plantbook snapshot)
    let referenceId: string | null | undefined = undefined;
    let referenceMessage = '';

    if (validatedData.clear_reference) {
      referenceId = null;
    } else if (validatedData.selected_pid) {
      try {
        const getOrCreatePlantReference = getOrCreatePlantReferenceUseCase();
        const reference = await getOrCreatePlantReference.execute({
          provider: 'OPEN_PLANTBOOK',
          external_id: validatedData.selected_pid,
        });
        referenceId = reference.id;
      } catch (refError) {
        console.error('[updatePlantAction] Error al resolver referencia botánica:', refError);
        referenceMessage = ' (No pudimos actualizar la referencia botánica, se mantuvieron los datos actuales).';
      }
    }

    // 4. Ejecución del Caso de Uso de actualización de Planta
    const plantRepository = new PrismaPlantRepository();
    const updatePlantUseCase = new UpdatePlantUseCase(plantRepository);

    const updatedPlant = await updatePlantUseCase.execute(plantId, {
      common_name: validatedData.common_name,
      scientific_name: validatedData.scientific_name,
      cultivar: validatedData.cultivar,
      health_status: validatedData.health_status,
      acquisition_date: validatedData.acquisition_date,
      location_id: validatedData.location_id,
      reference_id: referenceId,
      notes: validatedData.notes,
      pot_info: validatedData.pot_info,
      substrate_info: validatedData.substrate_info,
      light_conditions: validatedData.light_conditions,
      watering_notes: validatedData.watering_notes,
    });

    // 4. Procesamiento opcional de nueva fotografía (reemplazo de principal)
    const photoFile = formData.get('photo') as File | null;
    let photoMessage = '';
    if (photoFile && typeof photoFile === 'object' && 'size' in photoFile && photoFile.size > 0) {
      try {
        const fileBuffer = Buffer.from(await photoFile.arrayBuffer());
        await uploadAndRegisterPlantPhoto({
          plantId: updatedPlant.id,
          permanentCode: updatedPlant.permanent_code,
          fileBuffer,
          fileName: photoFile.name,
          makePrimary: true,
        });
      } catch (photoError) {
        console.error('[updatePlantAction] Error al actualizar fotografía:', photoError);
        photoMessage = ' (No se pudo actualizar la foto, intentá nuevamente).';
      }
    }

    // 5. Revalidar cache de Next.js
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath(`/plants/${updatedPlant.permanent_code}`);
    revalidatePath(`/plants/${updatedPlant.permanent_code}/edit`);
    revalidatePath(`/plants/${updatedPlant.id}`);

    return {
      success: true,
      permanent_code: updatedPlant.permanent_code,
      message: `Cambios guardados correctamente${referenceMessage}${photoMessage}`,
    };
  } catch (error: unknown) {
    return mapActionError(error, 'Algo salió mal al guardar los cambios.');
  }
}

/**
 * SERVER ACTION: Archivar Planta (SCR-003 / SCR-006)
 * Ejecuta ArchivePlantUseCase (soft delete), preservando permanent_code y toda la identidad.
 */
export async function archivePlantAction(plantId: string): Promise<PlantActionResult> {
  try {
    if (!plantId || plantId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ejemplar no proporcionado.',
      };
    }

    const plantRepository = new PrismaPlantRepository();
    const archivePlantUseCase = new ArchivePlantUseCase(plantRepository);

    const archivedPlant = await archivePlantUseCase.execute(plantId);

    // Revalidar cache de Next.js
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/plants/archived');
    revalidatePath(`/plants/${archivedPlant.permanent_code}`);
    revalidatePath(`/plants/${archivedPlant.id}`);

    return {
      success: true,
      permanent_code: archivedPlant.permanent_code,
      message: 'Ejemplar archivado correctamente',
    };
  } catch (error: unknown) {
    return mapActionError(error, 'No se pudo archivar el ejemplar.');
  }
}

/**
 * SERVER ACTION: Restaurar Planta (SCR-006)
 * Ejecuta RestorePlantUseCase restaurando la planta a ACTIVE.
 */
export async function restorePlantAction(plantId: string): Promise<PlantActionResult> {
  try {
    if (!plantId || plantId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ejemplar no proporcionado.',
      };
    }

    const plantRepository = new PrismaPlantRepository();
    const restorePlantUseCase = new RestorePlantUseCase(plantRepository);

    const restoredPlant = await restorePlantUseCase.execute(plantId);

    // Revalidar cache de Next.js
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/plants/archived');
    revalidatePath(`/plants/${restoredPlant.permanent_code}`);
    revalidatePath(`/plants/${restoredPlant.id}`);

    return {
      success: true,
      permanent_code: restoredPlant.permanent_code,
      message: 'Ejemplar restaurado al inventario activo',
    };
  } catch (error: unknown) {
    return mapActionError(error, 'No se pudo restaurar el ejemplar.');
  }
}

/**
 * SERVER ACTION: Agregar Fotografía al Historial de Evolución (ATP-FEAT-002)
 */
export async function addPlantPhotoAction(
  plantId: string,
  _prevState: PlantActionResult | null,
  formData: FormData
): Promise<PlantActionResult> {
  try {
    if (!plantId || plantId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ejemplar no proporcionado.',
      };
    }

    const plantRepository = new PrismaPlantRepository();
    const plant = await plantRepository.findById(plantId);
    if (!plant) {
      return {
        success: false,
        message: 'No se encontró el ejemplar especificado.',
      };
    }

    const photoFile = formData.get('photo') as File | null;
    if (!photoFile || typeof photoFile !== 'object' || !('size' in photoFile) || photoFile.size === 0) {
      return {
        success: false,
        errors: { photo: 'Debés seleccionar una fotografía para subir.' },
        message: 'Por favor seleccioná una imagen válida.',
      };
    }

    const takenAtStr = formData.get('taken_at') as string | null;
    let takenAt: Date | null = null;
    if (takenAtStr && takenAtStr.trim() !== '') {
      const parsed = new Date(takenAtStr);
      if (!isNaN(parsed.getTime())) {
        takenAt = parsed;
      }
    }

    const caption = (formData.get('caption') as string | null)?.trim() || null;
    const makePrimary = formData.get('make_primary') === 'true' || formData.get('make_primary') === 'on';

    const fileBuffer = Buffer.from(await photoFile.arrayBuffer());
    await uploadAndRegisterPlantPhoto({
      plantId: plant.id,
      permanentCode: plant.permanent_code,
      fileBuffer,
      fileName: photoFile.name,
      makePrimary,
      takenAt,
      caption,
    });

    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath(`/plants/${plant.permanent_code}`);
    revalidatePath(`/plants/${plant.id}`);

    return {
      success: true,
      permanent_code: plant.permanent_code,
      message: 'Fotografía agregada a la evolución del ejemplar.',
    };
  } catch (error: unknown) {
    return mapActionError(error, 'Error al subir la fotografía.');
  }
}

/**
 * SERVER ACTION: Establecer Foto Principal (ATP-FEAT-002)
 */
export async function setPrimaryPlantPhotoAction(
  plantId: string,
  photoId: string
): Promise<PlantActionResult> {
  try {
    if (!plantId || !photoId) {
      return {
        success: false,
        message: 'Parámetros insuficientes para establecer la foto principal.',
      };
    }

    const plantRepository = new PrismaPlantRepository();
    const photoRepository = new PrismaPhotoRepository();
    const setPrimaryUseCase = new SetPrimaryPhotoUseCase(plantRepository, photoRepository);

    await setPrimaryUseCase.execute({
      plant_id: plantId,
      photo_id: photoId,
    });

    const plant = await plantRepository.findById(plantId);
    if (plant) {
      revalidatePath('/');
      revalidatePath('/inventory');
      revalidatePath(`/plants/${plant.permanent_code}`);
      revalidatePath(`/plants/${plant.id}`);
    }

    return {
      success: true,
      message: 'Fotografía establecida como principal.',
    };
  } catch (error: unknown) {
    return mapActionError(error, 'Error al establecer la foto principal.');
  }
}

/**
 * SERVER ACTION: Actualizar Metadata de Foto (ATP-FEAT-002)
 */
export async function updatePlantPhotoMetadataAction(
  plantId: string,
  photoId: string,
  data: { taken_at?: string | null; caption?: string | null }
): Promise<PlantActionResult> {
  try {
    if (!plantId || !photoId) {
      return {
        success: false,
        message: 'Parámetros insuficientes para actualizar la metadata de la foto.',
      };
    }

    const plantRepository = new PrismaPlantRepository();
    const photoRepository = new PrismaPhotoRepository();
    const updateUseCase = new UpdatePlantPhotoMetadataUseCase(plantRepository, photoRepository);

    let takenAt: Date | null | undefined = undefined;
    if (data.taken_at !== undefined) {
      if (data.taken_at === null || data.taken_at.trim() === '') {
        takenAt = null;
      } else {
        const parsed = new Date(data.taken_at);
        takenAt = !isNaN(parsed.getTime()) ? parsed : null;
      }
    }

    await updateUseCase.execute({
      plant_id: plantId,
      photo_id: photoId,
      taken_at: takenAt,
      caption: data.caption,
    });

    const plant = await plantRepository.findById(plantId);
    if (plant) {
      revalidatePath(`/plants/${plant.permanent_code}`);
      revalidatePath(`/plants/${plant.id}`);
    }

    return {
      success: true,
      message: 'Detalles de la fotografía actualizados.',
    };
  } catch (error: unknown) {
    return mapActionError(error, 'Error al actualizar los detalles de la foto.');
  }
}

/**
 * SERVER ACTION: Eliminar Fotografía (ATP-FEAT-002)
 */
export async function deletePlantPhotoAction(
  plantId: string,
  photoId: string
): Promise<PlantActionResult> {
  try {
    if (!plantId || !photoId) {
      return {
        success: false,
        message: 'Parámetros insuficientes para eliminar la fotografía.',
      };
    }

    const plantRepository = new PrismaPlantRepository();
    const photoRepository = new PrismaPhotoRepository();
    const fileStorageService = getFileStorageService();
    const deleteUseCase = new DeletePlantPhotoUseCase(
      plantRepository,
      photoRepository,
      fileStorageService
    );

    await deleteUseCase.execute({
      plant_id: plantId,
      photo_id: photoId,
    });

    const plant = await plantRepository.findById(plantId);
    if (plant) {
      revalidatePath('/');
      revalidatePath('/inventory');
      revalidatePath(`/plants/${plant.permanent_code}`);
      revalidatePath(`/plants/${plant.id}`);
    }

    return {
      success: true,
      message: 'Fotografía eliminada correctamente.',
    };
  } catch (error: unknown) {
    return mapActionError(error, 'Error al eliminar la fotografía.');
  }
}

