import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

// Exercises pagination against a real PostgreSQL server: creates a
// disposable database, applies the repo migrations, seeds deterministic data,
// and drops the database afterwards. Requires a reachable PostgreSQL server
// (`docker compose up -d`). Not part of the default test run — see
// `pnpm back test:integration`.

type LabResultsService = typeof import('./labResultsService.js');
type GroupedPage = Awaited<ReturnType<LabResultsService['getByPatientPage']>>;

const TEST_DB_NAME = `ino_test_${randomBytes(4).toString('hex')}`;

let adminUrl: string | undefined;
let db: (typeof import('../db.js'))['db'] | undefined;
let getTimeSeriesPage: LabResultsService['getTimeSeriesPage'];
let getByPatientPage: LabResultsService['getByPatientPage'];

function urlWithDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function makeLabResult(id: string, patientId: string, date: string) {
  return {
    id,
    patientId,
    date,
    creatine: '1.00',
    chloride: '100.00',
    fastingGlucose: '90.00',
    potassium: '4.20',
    sodium: '140.00',
    totalCalcium: '9.50',
    totalProtein: '7.00',
    creatineUnit: 'mgdl',
    chlorideUnit: 'mmoll',
    fastingGlucoseUnit: 'mgdl',
    potassiumUnit: 'mmoll',
    sodiumUnit: 'ul',
    totalCalciumUnit: 'mgdl',
    totalProteinUnit: 'gdl'
  };
}

beforeAll(async () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Start PostgreSQL (`docker compose up -d`) and copy apps/backend/.env.example to apps/backend/.env'
    );
  }

  adminUrl = urlWithDatabase(baseUrl, 'postgres');
  process.env.DATABASE_URL = urlWithDatabase(baseUrl, TEST_DB_NAME);
  process.env.SQL_LOG_DISABLED = '1';

  // `migrate deploy` also creates the database when it doesn't exist yet
  execSync('npx prisma migrate deploy', { env: process.env, stdio: 'pipe' });

  // Import after DATABASE_URL points at the test database — the client
  // reads the connection string at module load.
  const dbModule = await import('../db.js');
  db = dbModule.db;
  ({ getByPatientPage, getTimeSeriesPage } = await import('./labResultsService.js'));

  await db.patient.createMany({
    data: ['p1', 'p2', 'p3'].map((id) => ({
      id,
      birthdate: '1950-01-01',
      gender: 1,
      ethnicity: 2
    }))
  });
  await db.labResult.createMany({
    data: [
      makeLabResult('lr-p3-1', 'p3', '2024-02-01'),
      makeLabResult('lr-p1-1', 'p1', '2024-01-10'),
      makeLabResult('lr-p1-2', 'p1', '2024-01-05'),
      makeLabResult('lr-p1-3', 'p1', '2024-01-01'),
      // same test date as lr-p1-1: covers the id tiebreaker and the
      // group_latest_date tie between p1 and p2
      makeLabResult('lr-p2-1', 'p2', '2024-01-10'),
      makeLabResult('lr-p2-2', 'p2', '2023-12-30')
    ]
  });
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
  if (!adminUrl) return;

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: adminUrl }) });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE)`);
  } finally {
    await admin.$disconnect();
  }
}, 60_000);

async function walkTimeSeries(limit: number) {
  const rows = [];
  let cursor: { date: string; id: string } | null = null;

  for (let page = 0; page < 10; page++) {
    const result = await getTimeSeriesPage({ limit, cursor });
    rows.push(...result.rows);
    cursor = result.nextCursor;
    if (!cursor) break;
  }

  expect(cursor).toBeNull();
  return rows;
}

async function walkGrouped(limit: number): Promise<GroupedPage['rows']> {
  const rows: GroupedPage['rows'] = [];
  let cursor: GroupedPage['nextCursor'] = null;

  for (let page = 0; page < 10; page++) {
    const result = await getByPatientPage({ limit, cursor });
    rows.push(...result.rows);
    cursor = result.nextCursor;
    if (!cursor) break;
  }

  expect(cursor).toBeNull();
  return rows;
}

describe('lab results pagination against a real database', () => {
  it('pages through the full time series in (date desc, id asc) order without gaps or duplicates', async () => {
    const rows = await walkTimeSeries(2);

    expect(rows.map((row) => row.id)).toEqual([
      'lr-p3-1',
      'lr-p1-1',
      'lr-p2-1',
      'lr-p1-2',
      'lr-p1-3',
      'lr-p2-2'
    ]);
  });

  it('pages through grouped rows in patient/date order without repeated headers', async () => {
    // limit 2 makes p1 span two pages, so the second page resumes within the
    // same patient group and should not emit another p1 header.
    const rows = await walkGrouped(2);

    expect(
      rows.map((row) =>
        row.kind === 'patient' ? `patient:${row.patient.id}` : `labResult:${row.labResult.id}`
      )
    ).toEqual([
      'patient:p1',
      'labResult:lr-p1-1',
      'labResult:lr-p1-2',
      'labResult:lr-p1-3',
      'patient:p2',
      'labResult:lr-p2-1',
      'labResult:lr-p2-2',
      'patient:p3',
      'labResult:lr-p3-1'
    ]);

    const headerCounts = rows.flatMap((row) =>
      row.kind === 'patient' ? [[row.patient.id, row.labResultCount] as const] : []
    );
    expect(Object.fromEntries(headerCounts)).toEqual({ p1: 3, p2: 2, p3: 1 });
  });
});
