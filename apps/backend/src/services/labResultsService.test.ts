import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  patientFindMany: vi.fn(),
  patientCount: vi.fn(),
  labResultFindMany: vi.fn(),
  labResultCount: vi.fn()
}));

vi.mock('../db.js', () => ({
  db: {
    $transaction: dbMocks.transaction,
    patient: {
      findMany: dbMocks.patientFindMany,
      count: dbMocks.patientCount
    },
    labResult: {
      findMany: dbMocks.labResultFindMany,
      count: dbMocks.labResultCount
    }
  }
}));

import {
  getByPatientPage,
  getStats,
  getTimeSeriesPage,
  MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT,
  MAX_LAB_RESULTS_PAGE_LIMIT
} from './labResultsService.js';

const patientFixture = { id: 'p1', birthdate: '1950-01-01', gender: 1, ethnicity: 2 };
const labResultFixture = { id: 'lr1', date: '2024-01-05' };
const groupedPatientFixture = {
  ...patientFixture,
  _count: {
    labResults: 2
  }
};
const groupedLabResultFixture = {
  ...labResultFixture,
  patientId: 'p1',
  patient: groupedPatientFixture
};

beforeEach(() => {
  dbMocks.transaction.mockReset();
  dbMocks.queryRaw.mockReset();
  dbMocks.patientFindMany.mockReset();
  dbMocks.patientCount.mockReset();
  dbMocks.labResultFindMany.mockReset();
  dbMocks.labResultCount.mockReset();

  dbMocks.transaction.mockImplementation((callback) =>
    callback({
      $queryRaw: dbMocks.queryRaw,
      patient: {
        findMany: dbMocks.patientFindMany
      },
      labResult: {
        findMany: dbMocks.labResultFindMany
      }
    })
  );
});

describe('getTimeSeriesPage', () => {
  it('queries without a keyset filter on the first page and reports no next cursor when the page is short', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([labResultFixture]);

    const page = await getTimeSeriesPage({ limit: 2 });

    expect(dbMocks.labResultFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
        take: 2,
        orderBy: [{ date: 'desc' }, { id: 'asc' }]
      })
    );
    expect(page).toEqual({ rows: [labResultFixture], nextCursor: null });
  });

  it('translates the cursor into a strictly-after keyset filter', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([]);

    await getTimeSeriesPage({ limit: 2, cursor: { date: '2024-01-05', id: 'lr1' } });

    expect(dbMocks.labResultFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { date: { lt: '2024-01-05' } },
            {
              date: '2024-01-05',
              id: { gt: 'lr1' }
            }
          ]
        }
      })
    );
  });

  it('returns the last row keys as the next cursor when the page is full', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([
      { id: 'lr1', date: '2024-01-06' },
      { id: 'lr2', date: '2024-01-05' }
    ]);

    const page = await getTimeSeriesPage({ limit: 2 });

    expect(page.nextCursor).toEqual({ date: '2024-01-05', id: 'lr2' });
  });
});

describe('getByPatientPage', () => {
  it('queries lab results by patient and inserts patient header rows', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([groupedLabResultFixture]);

    const page = await getByPatientPage({ limit: 5 });

    expect(page.rows).toEqual([
      { kind: 'patient', labResultCount: 2, patient: patientFixture },
      {
        kind: 'labResult',
        patient: patientFixture,
        labResult: labResultFixture
      }
    ]);
    expect(page.nextCursor).toBeNull();
    expect(dbMocks.labResultFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
        take: 5,
        orderBy: [{ patientId: 'asc' }, { date: 'desc' }, { id: 'asc' }]
      })
    );
    expect(dbMocks.patientFindMany).not.toHaveBeenCalled();
  });

  it('builds a lab result cursor when the page is full', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([groupedLabResultFixture]);

    const page = await getByPatientPage({ limit: 1 });

    expect(page.nextCursor).toEqual({
      patientId: 'p1',
      date: '2024-01-05',
      id: 'lr1'
    });
  });

  it('translates the cursor into a patient/date/id keyset filter', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([]);

    await getByPatientPage({
      limit: 2,
      cursor: { patientId: 'p1', date: '2024-01-05', id: 'lr1' }
    });

    expect(dbMocks.labResultFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { patientId: { gt: 'p1' } },
            {
              patientId: 'p1',
              date: { lt: '2024-01-05' }
            },
            {
              patientId: 'p1',
              date: '2024-01-05',
              id: { gt: 'lr1' }
            }
          ]
        }
      })
    );
  });

  it('does not repeat the patient header when continuing the same patient from a cursor', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([groupedLabResultFixture]);

    const page = await getByPatientPage({
      limit: 1,
      cursor: { patientId: 'p1', date: '2024-01-06', id: 'lr0' }
    });

    expect(page.rows).toEqual([
      {
        kind: 'labResult',
        patient: patientFixture,
        labResult: labResultFixture
      }
    ]);
  });

  it('returns an empty page when there are no lab results', async () => {
    dbMocks.labResultFindMany.mockResolvedValue([]);

    const page = await getByPatientPage();

    expect(page).toEqual({ rows: [], nextCursor: null });
    expect(dbMocks.patientFindMany).not.toHaveBeenCalled();
  });
});

describe('page limit validation', () => {
  it('rejects out-of-range and non-integer limits without querying', async () => {
    await expect(getTimeSeriesPage({ limit: 0 })).rejects.toThrow(RangeError);
    await expect(getTimeSeriesPage({ limit: 1.5 })).rejects.toThrow(RangeError);
    await expect(getTimeSeriesPage({ limit: MAX_LAB_RESULTS_PAGE_LIMIT + 1 })).rejects.toThrow(
      RangeError
    );
    await expect(getByPatientPage({ limit: 0 })).rejects.toThrow(RangeError);
    await expect(
      getByPatientPage({ limit: MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT + 1 })
    ).rejects.toThrow(RangeError);

    expect(dbMocks.labResultFindMany).not.toHaveBeenCalled();
    expect(dbMocks.transaction).not.toHaveBeenCalled();
  });
});

describe('getStats', () => {
  it('returns patient and lab result counts', async () => {
    dbMocks.patientCount.mockResolvedValue(3);
    dbMocks.labResultCount.mockResolvedValue(17);

    await expect(getStats()).resolves.toEqual({ patients: 3, labResults: 17 });
  });
});
