import { LAB_RESULTS_IMPORT_CONCURRENCY, LAB_RESULTS_INITIAL_PATIENTS } from '../config.js';
import { db } from '../db.js';
import { log } from '../helpers/logger.js';
import { runConcurrently } from '../util/runConcurrently.js';
import { sleep } from '../util/sleep.js';
import { fetchLabResultsFromApi } from './lab-results-import/fetchLabResultsFromApi.js';
import type { LabResultsDTO } from './lab-results-import/labResultsImportSchema.js';
import { saveLabResults } from './lab-results-import/saveLabResults.js';

// arbitrary retry limit for empty response
const MAX_ATTEMPTS = 5;

/**
 * Fetches and stores lab results.
 * Makes best effort to retrieve data for requested amount of patients,
 * although if api keeps returning empty results we might end up getting less,
 * but it shouldn't be critical for app's operation.
 * @param patients - amount of patients to import results for
 * @param concurrency - to speed up the process can run import concurrently
 */
export async function importLabResults(
  patients: number,
  concurrency = LAB_RESULTS_IMPORT_CONCURRENCY
): Promise<{ imported: number; failed: number }> {
  const ret = { imported: 0, failed: 0 };
  if (patients < 1) return ret;

  await runConcurrently(patients, concurrency, async () => {
    try {
      let attempt = MAX_ATTEMPTS;
      let labResults: LabResultsDTO[];
      // The task description states that API can return zero results, which is odd,
      // but we can handle it by retrying until we have more information about why that happens.
      do {
        labResults = await fetchLabResultsFromApi();
        if (attempt > 0 && attempt < MAX_ATTEMPTS) await sleep(300); // arbitrary delay, just to avoid spamming api server
      } while (labResults.length === 0 && --attempt > 0);

      await saveLabResults(labResults);

      ret.imported++;
    } catch (error) {
      log.error(error, 'Lab result import failed.');
    }
  });

  ret.failed = patients - ret.imported;

  log.info(ret, 'Lab results import finished.');

  return ret;
}

/**
 * Prefills database with some data from lab results api.
 */
export async function initializeLabResultsDataSet() {
  //WARN: theoretically patients can have no lab results, but not in our current workflow
  const existingPatients = await db.patient.count();

  if (existingPatients < LAB_RESULTS_INITIAL_PATIENTS) {
    await importLabResults(LAB_RESULTS_INITIAL_PATIENTS - existingPatients);
  }
}
