import { LAB_RESULTS_IMPORT_CONCURRENCY, LAB_RESULTS_INITIAL_PATIENTS } from '../config.js';
import { db } from '../db.js';
import { log } from '../helpers/logger.js';
import { runConcurrently } from '../util/runConcurrently.js';
import { sleep } from '../util/sleep.js';
import { fetchLabResultsFromApi } from './lab-results-import/fetchLabResultsFromApi.js';
import type { LabResultsDTO } from './lab-results-import/labResultsImportSchema.js';
import { saveLabResults } from './lab-results-import/saveLabResults.js';
import { resetAll } from './labResultsService.js';

const MAX_ATTEMPTS = 5;
const EMPTY_RETRY_DELAY_MS = 300;

/**
 * Imports up to the requested number of patient result batches.
 */
export async function importLabResults(
  patients: number,
  concurrency = LAB_RESULTS_IMPORT_CONCURRENCY
): Promise<{ imported: number; failed: number; empty: number }> {
  const ret = { imported: 0, failed: 0, empty: 0 };
  if (patients < 1) return ret;

  await runConcurrently(patients, concurrency, async () => {
    try {
      let labResults: LabResultsDTO[] = await fetchLabResultsFromApi();
      for (let attempt = 1; attempt < MAX_ATTEMPTS && labResults.length === 0; attempt++) {
        await sleep(EMPTY_RETRY_DELAY_MS);
        labResults = await fetchLabResultsFromApi();
      }

      if (labResults.length === 0) {
        ret.empty++;
        return;
      }

      await saveLabResults(labResults);

      ret.imported++;
    } catch (error) {
      ret.failed++;
      log.error(error, 'Lab result import failed.');
    }
  });

  log.info(ret, 'Lab results import finished.');

  return ret;
}

export async function initializeLabResultsDataSet() {
  const existingPatients = await db.patient.count();

  if (existingPatients < LAB_RESULTS_INITIAL_PATIENTS) {
    await importLabResults(LAB_RESULTS_INITIAL_PATIENTS - existingPatients);
  }
}

export async function resetLabResultsDataSet(): Promise<void> {
  await resetAll();
  await initializeLabResultsDataSet();
}
