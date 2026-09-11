'use server';

import { revalidatePath } from 'next/cache';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { CreatePlantUseCase } from '@/core/application/use-cases/CreatePlantUseCase';
import { UpdatePlantUseCase } from '@/core/application/use-cases/UpdatePlantUseCase';
import { ArchivePlantUseCase } from '@/core/application/use-cases/ArchivePlantUseCase';
import { RestorePlantUseCase } from '@/core/application/use-cases/RestorePlantUseCase';
import { PlantFormInputSchema, PlantFormRawInput } from './schemas/plant-form.schema';
import { uploadAndRegisterPlantPhoto } from './server/photo-service';
import { getOrCreatePlantReferenceUseCase } from '@/infrastructure/services/serviceContainer';
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
