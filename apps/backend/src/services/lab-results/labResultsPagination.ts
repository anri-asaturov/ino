import type { Prisma } from '../../../generated/prisma/client.js';

export type LabResultsPageInput = {
  limit?: number;
  cursor?: LabResultsCursor | null;
};

export type GroupedLabResultsPageInput = {
  limit?: number;
  cursor?: GroupedLabResultsCursor | null;
};

type LabResultsCursor = {
  date: string;
  id: string;
};

type GroupedLabResultsCursor = {
  patientId: string;
  date: string;
  id: string;
};

export function getTimeSeriesCursorWhere(
  cursor: LabResultsCursor | null | undefined
): Prisma.LabResultWhereInput | undefined {
  if (!cursor) return undefined;

  return {
    OR: [
      { date: { lt: cursor.date } },
      {
        date: cursor.date,
        id: { gt: cursor.id }
      }
    ]
  };
}

export function getGroupedCursorWhere(
  cursor: GroupedLabResultsCursor | null | undefined
): Prisma.LabResultWhereInput | undefined {
  if (!cursor) return undefined;

  return {
    OR: [
      { patientId: { gt: cursor.patientId } },
      {
        patientId: cursor.patientId,
        date: { lt: cursor.date }
      },
      {
        patientId: cursor.patientId,
        date: cursor.date,
        id: { gt: cursor.id }
      }
    ]
  };
}
