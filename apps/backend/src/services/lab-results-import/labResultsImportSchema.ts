import z from 'zod';

const dateOnlySchema = z.iso.date();
const labValueSchema = z.number();

const labResultsDTOSchema = z.object({
  client_id: z.string().min(1),
  date_testing: dateOnlySchema,
  date_birthdate: dateOnlySchema,
  gender: z.number().int(),
  ethnicity: z.number().int(),
  creatine: labValueSchema,
  chloride: labValueSchema,
  fasting_glucose: labValueSchema,
  potassium: labValueSchema,
  sodium: labValueSchema,
  total_calcium: labValueSchema,
  total_protein: labValueSchema,
  creatine_unit: z.string(),
  chloride_unit: z.string(),
  fasting_glucose_unit: z.string(),
  potassium_unit: z.string(),
  sodium_unit: z.string(),
  total_calcium_unit: z.string(),
  total_protein_unit: z.string()
});

/** Import api response type */
export type LabResultsDTO = z.infer<typeof labResultsDTOSchema>;

/** Import api response schema */
export const labResultsImportResponseSchema = z.array(labResultsDTOSchema);
