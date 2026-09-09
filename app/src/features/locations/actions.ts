'use server';

import { revalidatePath } from 'next/cache';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { CreateLocationUseCase } from '@/core/application/use-cases/CreateLocationUseCase';
import { RenameLocationUseCase } from '@/core/application/use-cases/RenameLocationUseCase';
import { ArchiveLocationUseCase } from '@/core/application/use-cases/ArchiveLocationUseCase';
import { RestoreLocationUseCase } from '@/core/application/use-cases/RestoreLocationUseCase';
import { LocationFormSchema } from './schemas/location-form.schema';

export interface LocationActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/**
 * SERVER ACTION: Crear Ubicación (SCR-007)
 */
export async function createLocationAction(
  _prevState: LocationActionResult | null,
  formData: FormData
): Promise<LocationActionResult> {
  try {
    const rawName = (formData.get('name') as string) || '';

    // 1. Validación Zod
    const validation = LocationFormSchema.safeParse({ name: rawName });
    if (!validation.success) {
      return {
        success: false,
        errors: { name: validation.error.issues[0]?.message || 'Nombre inválido.' },
        message: validation.error.issues[0]?.message || 'Error de validación.',
      };
    }

    // 2. Ejecutar caso de uso de aplicación
    const repository = new PrismaLocationRepository();
    const useCase = new CreateLocationUseCase(repository);
    await useCase.execute({ name: validation.data.name });

    // 3. Revalidar rutas
    revalidatePath('/locations');
    revalidatePath('/plants/new');
    revalidatePath('/plants/[id]/edit');

    return {
      success: true,
      message: 'Ubicación creada correctamente',
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err?.name === 'LocationValidationError') {
      return {
        success: false,
        errors: { name: err.message || 'Error de validación.' },
        message: err.message || 'Error de validación.',
      };
    }
    if (err?.name === 'LocationAlreadyExistsError') {
      return {
        success: false,
        errors: { name: err.message || 'La ubicación ya existe.' },
        message: err.message || 'La ubicación ya existe.',
      };
    }

    console.error('[createLocationAction] Error inesperado:', error);
    return {
      success: false,
      message: 'Algo salió mal al crear la ubicación.',
    };
  }
}

/**
 * SERVER ACTION: Renombrar Ubicación (SCR-007)
 */
export async function renameLocationAction(
  locationId: string,
  _prevState: LocationActionResult | null,
  formData: FormData
): Promise<LocationActionResult> {
  try {
    if (!locationId || locationId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ubicación no proporcionado.',
      };
    }

    const rawName = (formData.get('name') as string) || '';

    // 1. Validación Zod
    const validation = LocationFormSchema.safeParse({ name: rawName });
    if (!validation.success) {
      return {
        success: false,
        errors: { name: validation.error.issues[0]?.message || 'Nombre inválido.' },
        message: validation.error.issues[0]?.message || 'Error de validación.',
      };
    }

    // 2. Ejecutar caso de uso de aplicación
    const repository = new PrismaLocationRepository();
    const useCase = new RenameLocationUseCase(repository);
    await useCase.execute(locationId, { name: validation.data.name });

    // 3. Revalidar rutas
    revalidatePath('/locations');
    revalidatePath('/plants/new');
    revalidatePath('/plants/[id]/edit');
    revalidatePath('/inventory');
    revalidatePath('/');

    return {
      success: true,
      message: 'Ubicación actualizada correctamente',
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err?.name === 'LocationValidationError') {
      return {
        success: false,
        errors: { name: err.message || 'Error de validación.' },
        message: err.message || 'Error de validación.',
      };
    }
    if (err?.name === 'LocationAlreadyExistsError') {
      return {
        success: false,
        errors: { name: err.message || 'La ubicación ya existe.' },
        message: err.message || 'La ubicación ya existe.',
      };
    }
    if (err?.name === 'LocationNotFoundError') {
      return {
        success: false,
        message: 'La ubicación no fue encontrada.',
      };
    }

    console.error('[renameLocationAction] Error inesperado:', error);
    return {
      success: false,
      message: 'Algo salió mal al actualizar la ubicación.',
    };
  }
}

/**
 * SERVER ACTION: Archivar Ubicación (SCR-007)
 */
export async function archiveLocationAction(locationId: string): Promise<LocationActionResult> {
  try {
    if (!locationId || locationId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ubicación no proporcionado.',
      };
    }

    const repository = new PrismaLocationRepository();
    const useCase = new ArchiveLocationUseCase(repository);
    await useCase.execute(locationId);

    // Revalidar rutas
    revalidatePath('/locations');
    revalidatePath('/plants/new');
    revalidatePath('/plants/[id]/edit');

    return {
      success: true,
      message: 'Ubicación archivada correctamente',
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err?.name === 'LocationNotFoundError') {
      return {
        success: false,
        message: 'La ubicación a archivar no fue encontrada.',
      };
    }

    console.error('[archiveLocationAction] Error inesperado:', error);
    return {
      success: false,
      message: 'Algo salió mal al archivar la ubicación.',
    };
  }
}

/**
 * SERVER ACTION: Restaurar Ubicación (SCR-007)
 */
export async function restoreLocationAction(locationId: string): Promise<LocationActionResult> {
  try {
    if (!locationId || locationId.trim() === '') {
      return {
        success: false,
        message: 'Identificador de ubicación no proporcionado.',
      };
    }

    const repository = new PrismaLocationRepository();
    const useCase = new RestoreLocationUseCase(repository);
    await useCase.execute(locationId);

    // Revalidar rutas
    revalidatePath('/locations');
    revalidatePath('/plants/new');
    revalidatePath('/plants/[id]/edit');

    return {
      success: true,
      message: 'Ubicación restaurada correctamente',
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err?.name === 'LocationAlreadyExistsError') {
      return {
        success: false,
        errors: { name: err.message || 'Ya existe una ubicación activa con ese nombre.' },
        message: err.message || 'Ya existe una ubicación activa con ese nombre.',
      };
    }
    if (err?.name === 'LocationNotFoundError') {
      return {
        success: false,
        message: 'La ubicación a restaurar no fue encontrada.',
      };
    }

    console.error('[restoreLocationAction] Error inesperado:', error);
    return {
      success: false,
      message: 'Algo salió mal al restaurar la ubicación.',
    };
  }
}
