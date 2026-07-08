import { db } from '../db.js';
import {
  getGroupedCursorWhere,
  getTimeSeriesCursorWhere,
  type GroupedLabResultsPageInput,
  type LabResultsPageInput
} from './lab-results/labResultsPagination.js';
import {
  groupedLabResultSelect,
  labResultSelect,
  patientSelect
} from './lab-results/labResultSelects.js';
import { toGroupedRows } from './lab-results/toGroupedRows.js';

export const DEFAULT_LAB_RESULTS_PAGE_LIMIT = 100;
export const MAX_LAB_RESULTS_PAGE_LIMIT = 200;
export const DEFAULT_GROUPED_LAB_RESULTS_PAGE_LIMIT = 100;
export const MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT = 200;

export async function getTimeSeriesPage({
  limit = DEFAULT_LAB_RESULTS_PAGE_LIMIT,
  cursor
}: LabResultsPageInput = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LAB_RESULTS_PAGE_LIMIT) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_LAB_RESULTS_PAGE_LIMIT}`);
  }

  const labResults = await db.labResult.findMany({
    where: getTimeSeriesCursorWhere(cursor),
    take: limit,
    orderBy: [{ date: 'desc' }, { id: 'asc' }],
    select: {
      ...labResultSelect,
      patient: {
        select: patientSelect
      }
    }
  });

  const lastRow = labResults.at(-1);

  return {
    rows: labResults,
    nextCursor:
      labResults.length === limit && lastRow ? { date: lastRow.date, id: lastRow.id } : null
  };
}

export async function getByPatientPage({
  limit = DEFAULT_GROUPED_LAB_RESULTS_PAGE_LIMIT,
  cursor
}: GroupedLabResultsPageInput = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT) {
    throw new RangeError(
      `limit must be an integer between 1 and ${MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT}`
    );
  }

  const labResults = await db.labResult.findMany({
    where: getGroupedCursorWhere(cursor),
    take: limit,
    orderBy: [{ patientId: 'asc' }, { date: 'desc' }, { id: 'asc' }],
    select: groupedLabResultSelect
  });

  const lastRow = labResults.at(-1);

  return {
    rows: toGroupedRows(labResults, cursor?.patientId ?? null),
    nextCursor:
      labResults.length === limit && lastRow
        ? { patientId: lastRow.patientId, date: lastRow.date, id: lastRow.id }
        : null
  };
}

export async function getStats() {
  const [patients, labResults] = await Promise.all([db.patient.count(), db.labResult.count()]);

  return { patients, labResults };
}

export async function resetAll() {
  await db.$transaction(async (tx) => {
    await tx.labResult.deleteMany();
    await tx.patient.deleteMany();
  });
}
