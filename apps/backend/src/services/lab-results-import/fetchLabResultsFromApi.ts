import { MOCK_API_LAB_RESULTS_URL } from '../../config.js';
import { LabResultsImportError } from './LabResultsImportError.js';
import { labResultsImportResponseSchema, type LabResultsDTO } from './labResultsImportSchema.js';

/**
 * Attempts a single fetch from lab results api
 * @returns parsed results
 */
export async function fetchLabResultsFromApi(): Promise<LabResultsDTO[]> {
  let response: Response;

  try {
    response = await fetch(MOCK_API_LAB_RESULTS_URL, {
      headers: {
        accept: 'application/json'
      },
      signal: AbortSignal.timeout(30_000) // node's default is 10 minutes...
    });
  } catch (error) {
    throw new LabResultsImportError('Mock API request failed', { cause: error });
  }

  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    throw new LabResultsImportError(
      `Mock API request failed with HTTP ${response.status}${statusText}`
    );
  }

  return parseLabResultsResponse(response);
}

// takes http response with unconsumed body and returns safe, parsed data
async function parseLabResultsResponse(response: Response): Promise<LabResultsDTO[]> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new LabResultsImportError('Mock API response is not valid JSON', { cause: error });
  }

  // Validate the external response before using it for database writes.
  const parsed = labResultsImportResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LabResultsImportError('Mock API returned an invalid lab result payload', {
      cause: parsed.error
    });
  }

  return parsed.data;
}
