import { z } from 'zod';

export const HealthStatusSchema = z.enum(['UNKNOWN', 'HEALTHY', 'ATTENTION', 'RECOVERY'], {
  message: 'El estado de salud no es válido.',
});

export const PlantFormInputSchema = z.object({
  common_name: z
    .string({
      error: 'El nombre común es obligatorio.',
    })
    .trim()
    .min(1, 'El nombre común es obligatorio y no puede estar vacío.')
    .max(100, 'El nombre común no puede superar los 100 caracteres.'),
  scientific_name: z
    .string()
    .trim()
    .max(150, 'El nombre científico no puede superar los 150 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  cultivar: z
    .string()
    .trim()
    .max(100, 'El cultivar no puede superar los 100 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  health_status: HealthStatusSchema.default('UNKNOWN'),
  acquisition_date: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        // Valida formato de fecha YYYY-MM-DD
        return /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val));
      },
      {
        message: 'La fecha de adquisición debe tener un formato válido (AAAA-MM-DD).',
      }
    )
    .transform((val) => {
      if (!val || val.trim() === '') return null;
      // Convertir a Date en mediodía UTC para evitar desplazamientos de zona horaria
      const [year, month, day] = val.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }),
  location_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val !== 'none' && val.trim() !== '' ? val.trim() : null)),
  notes: z
    .string()
    .trim()
    .max(2000, 'Las notas no pueden superar los 2000 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  pot_info: z
    .string()
    .trim()
    .max(200, 'La información de maceta no puede superar los 200 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  substrate_info: z
    .string()
    .trim()
    .max(200, 'La información de sustrato no puede superar los 200 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  light_conditions: z
    .string()
    .trim()
    .max(200, 'Las condiciones de luz no pueden superar los 200 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  watering_notes: z
    .string()
    .trim()
    .max(500, 'Las notas de riego no pueden superar los 500 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  selected_pid: z
    .string()
    .trim()
    .max(200, 'El identificador botánico no puede superar los 200 caracteres.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val.trim() : null)),
  clear_reference: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val === 'true' || val === '1'),
});

export type PlantFormRawInput = {
  common_name: string;
  scientific_name?: string | null;
  cultivar?: string | null;
  health_status?: string;
  acquisition_date?: string | null;
  location_id?: string | null;
  notes?: string | null;
  pot_info?: string | null;
  substrate_info?: string | null;
  light_conditions?: string | null;
  watering_notes?: string | null;
  selected_pid?: string | null;
  clear_reference?: string | boolean | null;
};

export type PlantFormValidatedData = z.infer<typeof PlantFormInputSchema>;

