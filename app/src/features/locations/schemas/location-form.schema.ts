import { z } from 'zod';

export const LocationFormSchema = z.object({
  name: z
    .string({
      error: 'El nombre de la ubicación es obligatorio.',
    })
    .trim()
    .min(2, 'El nombre de la ubicación debe tener entre 2 y 50 caracteres.')
    .max(50, 'El nombre de la ubicación debe tener entre 2 y 50 caracteres.'),
});

export type LocationFormData = z.infer<typeof LocationFormSchema>;
