import z from 'zod';
import {
  importLabResults,
  initializeLabResultsDataSet
} from '../services/labResultsImportService.js';
import {
  DEFAULT_IMPORT_PATIENTS,
  DEFAULT_GROUPED_LAB_RESULTS_PAGE_LIMIT,
  DEFAULT_LAB_RESULTS_PAGE_LIMIT,
  getByPatientPage,
  getStats,
  getTimeSeriesPage,
  MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT,
  MAX_IMPORT_PATIENTS,
  MAX_LAB_RESULTS_PAGE_LIMIT,
  resetAll
} from '../services/labResultsService.js';
import { publicProc, router } from './trpc-server.js';

const labResultsCursorSchema = z.object({
  date: z.string().min(1),
  id: z.string().min(1)
});

const groupedCursorSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('patient'),
    latestDate: z.string().min(1),
    patientId: z.string().min(1)
  }),
  z.object({
    kind: z.literal('labResult'),
    latestDate: z.string().min(1),
    patientId: z.string().min(1),
    date: z.string().min(1),
    id: z.string().min(1)
  })
]);

const timeSeriesInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LAB_RESULTS_PAGE_LIMIT)
    .default(DEFAULT_LAB_RESULTS_PAGE_LIMIT),
  cursor: labResultsCursorSchema.nullable().optional()
});

const byPatientInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT)
    .default(DEFAULT_GROUPED_LAB_RESULTS_PAGE_LIMIT),
  cursor: groupedCursorSchema.nullable().optional()
});

const labResultsPatientsInputSchema = z
  .object({
    patients: z.number().int().min(1).max(MAX_IMPORT_PATIENTS).default(DEFAULT_IMPORT_PATIENTS)
  })
  .optional();

export const trpcRouter = router({
  labResults: {
    timeSeries: publicProc.input(timeSeriesInputSchema).query(async ({ input }) => {
      await initializeLabResultsDataSet();
      return getTimeSeriesPage(input);
    }),
    byPatient: publicProc.input(byPatientInputSchema).query(async ({ input }) => {
      await initializeLabResultsDataSet();
      return getByPatientPage(input);
    }),
    stats: publicProc.query(() => {
      return getStats();
    }),
    reset: publicProc.mutation(() => {
      return resetAll();
    }),
    addNewData: publicProc.input(labResultsPatientsInputSchema).mutation(({ input }) => {
      return importLabResults(input?.patients ?? DEFAULT_IMPORT_PATIENTS);
    })
  }
});

export type ApiRouter = typeof trpcRouter;
