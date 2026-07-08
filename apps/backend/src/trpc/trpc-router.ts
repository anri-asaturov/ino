import z from 'zod';
import { LAB_RESULTS_INITIAL_PATIENTS, MAX_IMPORT_PATIENTS } from '../config.js';
import { importLabResults, resetLabResultsDataSet } from '../services/labResultsImportService.js';
import {
  DEFAULT_GROUPED_LAB_RESULTS_PAGE_LIMIT,
  DEFAULT_LAB_RESULTS_PAGE_LIMIT,
  getByPatientPage,
  getStats,
  getTimeSeriesPage,
  MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT,
  MAX_LAB_RESULTS_PAGE_LIMIT
} from '../services/labResultsService.js';
import { publicProc, router } from './trpc-server.js';

const labResultsCursorSchema = z.object({
  date: z.string().min(1),
  id: z.string().min(1)
});

const groupedCursorSchema = z.object({
  patientId: z.string().min(1),
  date: z.string().min(1),
  id: z.string().min(1)
});

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
    patients: z.number().int().min(1).max(MAX_IMPORT_PATIENTS).default(LAB_RESULTS_INITIAL_PATIENTS)
  })
  .optional();

export const trpcRouter = router({
  labResults: {
    timeSeries: publicProc.input(timeSeriesInputSchema).query(({ input }) => {
      return getTimeSeriesPage(input);
    }),
    byPatient: publicProc.input(byPatientInputSchema).query(({ input }) => {
      return getByPatientPage(input);
    }),
    stats: publicProc.query(() => {
      return getStats();
    }),
    reset: publicProc.mutation(() => {
      return resetLabResultsDataSet();
    }),
    addNewData: publicProc.input(labResultsPatientsInputSchema).mutation(({ input }) => {
      return importLabResults(input?.patients ?? LAB_RESULTS_INITIAL_PATIENTS);
    })
  }
});

export type ApiRouter = typeof trpcRouter;
