import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LabResultsDTO } from './labResultsImportSchema.js';

const dbMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  patientUpsert: vi.fn(),
  labResultUpsert: vi.fn()
}));

vi.mock('../../db.js', () => ({
  db: {
    $transaction: dbMocks.transaction
  }
}));

import { saveLabResults } from './saveLabResults.js';

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

describe('saveLabResults', () => {
  beforeEach(() => {
    dbMocks.transaction.mockReset();
    dbMocks.patientUpsert.mockReset();
    dbMocks.labResultUpsert.mockReset();

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

  it('does not start a database transaction for empty lab result batches', async () => {
    await expect(saveLabResults([])).resolves.toBeUndefined();

    expect(dbMocks.transaction).not.toHaveBeenCalled();
  });

  it('upserts unique patients and inserts lab results in one transaction', async () => {
    const updatedPatientLabResults = {
      ...labResultsFixture,
      date_testing: '2018-11-26',
      creatine: 1.5
    } satisfies LabResultsDTO;

    await expect(
      saveLabResults([labResultsFixture, updatedPatientLabResults])
    ).resolves.toBeUndefined();

    expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
    expect(dbMocks.patientUpsert).toHaveBeenCalledTimes(1);
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
    expect(dbMocks.labResultUpsert).toHaveBeenCalledTimes(2);
    expect(dbMocks.labResultUpsert).toHaveBeenNthCalledWith(1, {
      where: {
        patientId_date: {
          patientId: 'b7e289cd',
          date: '2018-03-20'
        }
      },
      create: expect.objectContaining({
        patientId: 'b7e289cd',
        date: '2018-03-20',
        creatine: '0.82'
      }),
      update: expect.objectContaining({
        creatine: '0.82'
      })
    });
    expect(dbMocks.labResultUpsert).toHaveBeenNthCalledWith(2, {
      where: {
        patientId_date: {
          patientId: 'b7e289cd',
          date: '2018-11-26'
        }
      },
      create: expect.objectContaining({
        patientId: 'b7e289cd',
        date: '2018-11-26',
        creatine: '1.5'
      }),
      update: expect.objectContaining({
        creatine: '1.5'
      })
    });
  });
});
