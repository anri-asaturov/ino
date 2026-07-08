import { Prisma } from '../../generated/prisma/client.js';
import { db } from '../db.js';

export const DEFAULT_IMPORT_PATIENTS = 10;
export const MAX_IMPORT_PATIENTS = 200;
export const DEFAULT_LAB_RESULTS_PAGE_LIMIT = 100;
export const MAX_LAB_RESULTS_PAGE_LIMIT = 200;
export const DEFAULT_GROUPED_LAB_RESULTS_PAGE_LIMIT = 100;
export const MAX_GROUPED_LAB_RESULTS_PAGE_LIMIT = 200;

type LabResultsPageInput = {
  limit?: number;
  cursor?: LabResultsCursor | null;
};

type GroupedLabResultsPageInput = {
  limit?: number;
  cursor?: GroupedLabResultsCursor | null;
};

type LabResultsCursor = {
  date: string;
  id: string;
};

type GroupedLabResultsCursor =
  | {
      kind: 'patient';
      latestDate: string;
      patientId: string;
    }
  | {
      kind: 'labResult';
      latestDate: string;
      patientId: string;
      date: string;
      id: string;
    };

type GroupedLabResultsRawRow = {
  group_latest_date: string;
  patient_id: string;
  lab_result_count: number;
  row_kind: number;
  lab_result_id: string | null;
  lab_result_date: string | null;
};

const labResultSelect = {
  id: true,
  date: true,
  creatine: true,
  chloride: true,
  fastingGlucose: true,
  potassium: true,
  sodium: true,
  totalCalcium: true,
  totalProtein: true,
  creatineUnit: true,
  chlorideUnit: true,
  fastingGlucoseUnit: true,
  potassiumUnit: true,
  sodiumUnit: true,
  totalCalciumUnit: true,
  totalProteinUnit: true
} as const;

const patientSelect = {
  id: true,
  birthdate: true,
  gender: true,
  ethnicity: true
} as const;

export async function getTimeSeriesPage({
  limit = DEFAULT_LAB_RESULTS_PAGE_LIMIT,
  cursor
}: LabResultsPageInput = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LAB_RESULTS_PAGE_LIMIT) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_LAB_RESULTS_PAGE_LIMIT}`);
  }

  const labResults = await db.labResult.findMany({
    where: cursor
      ? {
          OR: [
            { date: { lt: cursor.date } },
            {
              date: cursor.date,
              id: { gt: cursor.id }
            }
          ]
        }
      : undefined,
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

  return db.$transaction(async (tx) => {
    const displayRows = await tx.$queryRaw<GroupedLabResultsRawRow[]>`
      WITH patient_groups AS (
        SELECT
          patient_id,
          MAX(date) AS group_latest_date,
          COUNT(*)::int AS lab_result_count
        FROM lab_results
        GROUP BY patient_id
      ),
      display_rows AS (
        SELECT
          group_latest_date,
          patient_id,
          lab_result_count,
          0::int AS row_kind,
          NULL::text AS lab_result_id,
          NULL::text AS lab_result_date
        FROM patient_groups

        UNION ALL

        SELECT
          patient_groups.group_latest_date,
          patient_groups.patient_id,
          patient_groups.lab_result_count,
          1::int AS row_kind,
          lab_results.id AS lab_result_id,
          lab_results.date AS lab_result_date
        FROM patient_groups
        JOIN lab_results ON lab_results.patient_id = patient_groups.patient_id
      )
      SELECT
        group_latest_date,
        patient_id,
        lab_result_count,
        row_kind,
        lab_result_id,
        lab_result_date
      FROM display_rows
      ${getGroupedCursorSql(cursor)}
      ORDER BY
        group_latest_date DESC,
        patient_id ASC,
        row_kind ASC,
        lab_result_date DESC NULLS LAST,
        lab_result_id ASC NULLS FIRST
      LIMIT ${limit}
    `;

    if (displayRows.length === 0) {
      return {
        rows: [],
        nextCursor: null
      };
    }

    const patientIds = [...new Set(displayRows.map((row) => row.patient_id))];
    const labResultIds = [
      ...new Set(displayRows.flatMap((row) => (row.lab_result_id ? [row.lab_result_id] : [])))
    ];

    const patients = await tx.patient.findMany({
      where: {
        id: { in: patientIds }
      },
      select: patientSelect
    });
    const labResults = await tx.labResult.findMany({
      where: {
        id: { in: labResultIds }
      },
      select: labResultSelect
    });
    const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
    const labResultsById = new Map(labResults.map((labResult) => [labResult.id, labResult]));

    const rows = displayRows.map((row) => {
      const patient = patientsById.get(row.patient_id);

      if (!patient) {
        throw new Error('Grouped lab result row is missing patient data');
      }

      if (row.row_kind === 0) {
        return {
          kind: 'patient' as const,
          latestDate: row.group_latest_date,
          labResultCount: row.lab_result_count,
          patient
        };
      }

      if (!row.lab_result_id) {
        throw new Error('Grouped lab result row is missing lab result id');
      }

      const labResult = labResultsById.get(row.lab_result_id);

      if (!labResult) {
        throw new Error('Grouped lab result row is missing lab result data');
      }

      return {
        kind: 'labResult' as const,
        latestDate: row.group_latest_date,
        patient,
        labResult
      };
    });
    const lastDisplayRow = displayRows.at(-1);

    return {
      rows,
      nextCursor:
        displayRows.length === limit && lastDisplayRow ? toGroupedCursor(lastDisplayRow) : null
    };
  });
}

function getGroupedCursorSql(cursor: GroupedLabResultsCursor | null | undefined) {
  if (!cursor) return Prisma.empty;

  const rowKind = cursor.kind === 'patient' ? 0 : 1;

  if (cursor.kind === 'patient') {
    return Prisma.sql`
      WHERE
        group_latest_date < ${cursor.latestDate}
        OR (
          group_latest_date = ${cursor.latestDate}
          AND patient_id > ${cursor.patientId}
        )
        OR (
          group_latest_date = ${cursor.latestDate}
          AND patient_id = ${cursor.patientId}
          AND row_kind > ${rowKind}
        )
    `;
  }

  return Prisma.sql`
    WHERE
      group_latest_date < ${cursor.latestDate}
      OR (
        group_latest_date = ${cursor.latestDate}
        AND patient_id > ${cursor.patientId}
      )
      OR (
        group_latest_date = ${cursor.latestDate}
        AND patient_id = ${cursor.patientId}
        AND row_kind > ${rowKind}
      )
      OR (
        group_latest_date = ${cursor.latestDate}
        AND patient_id = ${cursor.patientId}
        AND row_kind = ${rowKind}
        AND (
          lab_result_date < ${cursor.date}
          OR (
            lab_result_date = ${cursor.date}
            AND lab_result_id > ${cursor.id}
          )
        )
      )
  `;
}

function toGroupedCursor(row: GroupedLabResultsRawRow): GroupedLabResultsCursor {
  if (row.row_kind === 0) {
    return {
      kind: 'patient',
      latestDate: row.group_latest_date,
      patientId: row.patient_id
    };
  }

  if (!row.lab_result_date || !row.lab_result_id) {
    throw new Error('Grouped lab result cursor is missing lab result data');
  }

  return {
    kind: 'labResult',
    latestDate: row.group_latest_date,
    patientId: row.patient_id,
    date: row.lab_result_date,
    id: row.lab_result_id
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
