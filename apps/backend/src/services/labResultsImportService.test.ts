import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LabResultsDTO } from './lab-results-import/labResultsImportSchema.js';

const dbMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  patientUpsert: vi.fn(),
  labResultUpsert: vi.fn()
}));

const logMocks = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}));

const fetchMock = vi.fn();
const sleepMock = vi.hoisted(() => vi.fn());

vi.mock('../config.js', () => ({
  MOCK_API_LAB_RESULTS_URL: 'https://mock-api.test/data'
}));

vi.mock('../util/sleep.js', () => ({
  sleep: sleepMock
}));

vi.mock('../db.js', () => ({
  db: {
    $transaction: dbMocks.transaction,
    patient: {
      upsert: dbMocks.patientUpsert
    },
    labResult: {
      upsert: dbMocks.labResultUpsert
    }
  }
}));

vi.mock('../helpers/logger.js', () => ({
  log: {
    info: logMocks.info,
    error: logMocks.error
  }
}));

import { LabResultsImportError } from './lab-results-import/LabResultsImportError.js';
import { importLabResults } from './labResultsImportService.js';

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

describe('lab result import service', () => {
  beforeEach(() => {
    dbMocks.transaction.mockReset();
    dbMocks.patientUpsert.mockReset();
    dbMocks.labResultUpsert.mockReset();
    logMocks.info.mockReset();
    logMocks.error.mockReset();
    fetchMock.mockReset();
    sleepMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);

    dbMocks.transaction.mockImplementation((callback) =>
      callback({
        patient: {
          upsert: dbMocks.patientUpsert
        },
        labResult: {
          upsert: dbMocks.labResultUpsert
        }
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches, validates, and saves lab results from the mock API', async () => {
    fetchMock.mockResolvedValue(Response.json([labResultsFixture]));

    await expect(importLabResults(1)).resolves.toEqual({ imported: 1, failed: 0 });

    expect(fetchMock).toHaveBeenCalledWith('https://mock-api.test/data', {
      headers: {
        accept: 'application/json'
      },
      signal: expect.any(AbortSignal)
    });
    expect(dbMocks.patientUpsert).toHaveBeenCalledWith({
      where: { id: 'b7e289cd' },
      create: {
        id: 'b7e289cd',
        birthdate: '1950-01-01',
        gender: 1,
        ethnicity: 2
      },
      update: {
        birthdate: '1950-01-01',
        gender: 1,
        ethnicity: 2
      }
    });
    expect(dbMocks.labResultUpsert).toHaveBeenCalledWith({
      where: {
        patientId_date: {
          patientId: 'b7e289cd',
          date: '2018-03-20'
        }
      },
      create: expect.objectContaining({
        patientId: 'b7e289cd',
        date: '2018-03-20',
        creatine: '0.82',
        fastingGlucose: '117.85'
      }),
      update: expect.objectContaining({
        creatine: '0.82',
        fastingGlucose: '117.85'
      })
    });
    expect(logMocks.info).toHaveBeenCalledWith(
      { imported: 1, failed: 0 },
      'Lab results import finished.'
    );
  });

  it('retries empty lab result batches before counting them as successful no-ops', async () => {
    fetchMock.mockImplementation(async () => Response.json([]));

    await expect(importLabResults(1)).resolves.toEqual({ imported: 1, failed: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(sleepMock).toHaveBeenCalledTimes(4);
    expect(dbMocks.transaction).not.toHaveBeenCalled();
    expect(dbMocks.labResultUpsert).not.toHaveBeenCalled();
    expect(logMocks.info).toHaveBeenCalledWith(
      { imported: 1, failed: 0 },
      'Lab results import finished.'
    );
  });

  it('counts failed imports when the mock API request fails', async () => {
    const error = new Error('network failure');
    fetchMock.mockRejectedValue(error);

    await expect(importLabResults(1)).resolves.toEqual({ imported: 0, failed: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.labResultUpsert).not.toHaveBeenCalled();
    expect(logMocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: error,
        name: LabResultsImportError.name,
        message: 'Mock API request failed'
      }),
      'Lab result import failed.'
    );
    expect(logMocks.info).toHaveBeenCalledWith(
      { imported: 0, failed: 1 },
      'Lab results import finished.'
    );
  });

  it('counts and logs failed imports when saving lab results fails', async () => {
    const error = new Error('database failure');
    fetchMock.mockResolvedValue(Response.json([labResultsFixture]));
    dbMocks.labResultUpsert.mockRejectedValue(error);

    await expect(importLabResults(1)).resolves.toEqual({ imported: 0, failed: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.labResultUpsert).toHaveBeenCalledTimes(1);
    expect(logMocks.error).toHaveBeenCalledWith(error, 'Lab result import failed.');
    expect(logMocks.info).toHaveBeenCalledWith(
      { imported: 0, failed: 1 },
      'Lab results import finished.'
    );
  });

  it('fetches and saves the requested number of batches with bounded concurrency', async () => {
    let activeFetches = 0;
    let maxActiveFetches = 0;
    fetchMock.mockImplementation(async () => {
      activeFetches++;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeFetches--;

      return Response.json([labResultsFixture]);
    });

    await expect(importLabResults(5, 2)).resolves.toEqual({ imported: 5, failed: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(dbMocks.labResultUpsert).toHaveBeenCalledTimes(5);
    expect(maxActiveFetches).toBe(2);
    expect(logMocks.info).toHaveBeenCalledWith(
      { imported: 5, failed: 0 },
      'Lab results import finished.'
    );
  });
});
