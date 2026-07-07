import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { LabResultsDTO } from './labResultsImportSchema.js';

const fetchMock = vi.fn();

vi.mock('../../config.js', () => ({
  MOCK_API_LAB_RESULTS_URL: 'https://mock-api.test/data'
}));

import { fetchLabResultsFromApi } from './fetchLabResultsFromApi.js';
import { LabResultsImportError } from './LabResultsImportError.js';

const labResultsFixture = {
  client_id: 'b7e289cd',
  date_testing: '2018-03-20',
  date_birthdate: '1950-01-01',
  gender: 1,
  ethnicity: 2,
  creatine: 0.82,
  chloride: 102.06,
  fasting_glucose: 117.85,
  potassium: 8.33,
  sodium: 121.3,
  total_calcium: 10.04,
  total_protein: 7.91,
  creatine_unit: 'mgdl',
  chloride_unit: 'mmoll',
  fasting_glucose_unit: 'mgdl',
  potassium_unit: 'mmoll',
  sodium_unit: 'ul',
  total_calcium_unit: 'mgdl',
  total_protein_unit: 'gdl'
} satisfies LabResultsDTO;

describe('fetchLabResultsFromApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and validates lab result payloads from the mock API', async () => {
    fetchMock.mockResolvedValue(Response.json([labResultsFixture]));

    await expect(fetchLabResultsFromApi()).resolves.toEqual([labResultsFixture]);

    expect(fetchMock).toHaveBeenCalledWith('https://mock-api.test/data', {
      headers: {
        accept: 'application/json'
      },
      signal: expect.any(AbortSignal)
    });
  });

  it('throws an import error for non-successful HTTP responses', async () => {
    fetchMock.mockResolvedValue(
      new Response('unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    );

    const promise = fetchLabResultsFromApi();

    await expect(promise).rejects.toMatchObject({
      name: LabResultsImportError.name,
      message: 'Mock API request failed with HTTP 503 Service Unavailable'
    });
    await expect(promise).rejects.toBeInstanceOf(LabResultsImportError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws an import error with the JSON parse error as cause', async () => {
    fetchMock.mockResolvedValue(new Response('not-json'));

    await expect(fetchLabResultsFromApi()).rejects.toMatchObject({
      name: LabResultsImportError.name,
      message: 'Mock API response is not valid JSON',
      cause: expect.any(SyntaxError)
    });
  });

  it('throws an import error with the validation error as cause', async () => {
    fetchMock.mockResolvedValue(
      Response.json([
        {
          ...labResultsFixture,
          date_testing: '2021-02-29'
        }
      ])
    );

    await expect(fetchLabResultsFromApi()).rejects.toMatchObject({
      name: LabResultsImportError.name,
      message: 'Mock API returned an invalid lab result payload',
      cause: expect.any(ZodError)
    });
  });
});
