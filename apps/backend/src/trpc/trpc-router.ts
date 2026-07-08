import z from 'zod';
import {
  importLabResults,
  initializeLabResultsDataSet
} from '../services/labResultsImportService.js';
import {
  DEFAULT_PATIENTS_RET,
  getAll,
  MAX_PATIENTS_RET,
  resetAll
} from '../services/labResultsService.js';
import { publicProc, router } from './trpc-server.js';

const labResultsGetInputSchema = z
  .object({
    patients: z.number().int().min(1).max(MAX_PATIENTS_RET).default(DEFAULT_PATIENTS_RET)
  })
  .optional();

export const trpcRouter = router({
  labResults: {
    get: publicProc.input(labResultsGetInputSchema).query(async ({ input }) => {
      await initializeLabResultsDataSet();
      return getAll(input?.patients);
    }),
    reset: publicProc.mutation(() => {
      return resetAll();
    }),
    addNewData: publicProc.mutation(() => {
      return importLabResults(DEFAULT_PATIENTS_RET, 3);
    })
  }
});

export type ApiRouter = typeof trpcRouter;
