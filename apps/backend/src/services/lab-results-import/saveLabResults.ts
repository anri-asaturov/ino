import type { Prisma } from '../../../generated/prisma/client.js';
import { db, type PrismaTransactionClient } from '../../db.js';
import type { LabResultsDTO } from './labResultsImportSchema.js';
import { toLabResultsCreateInput } from './toLabResultsCreateInput.js';

type PatientInput = Prisma.PatientCreateManyInput;

export async function saveLabResults(labResults: LabResultsDTO[]): Promise<void> {
  if (labResults.length === 0) {
    return;
  }

  // we use transaction for 'all or nothing outcome', seems more reasonable than partial import
  await db.$transaction(async (tx) => {
    for (const patient of getPatientInputs(labResults)) {
      await upsertPatient(tx, patient);
    }

    for (const resultSet of labResults) {
      await upsertLabResults(tx, resultSet);
    }
  });
}

// API contract kinda specifies that one api call returns data for one patient only,
// but we don't really enforce or validate that, it's not too hard to be safe here.
// Also safe to skip this for performance reasons, if any and just take patient data from the first array element.
function getPatientInputs(labResults: LabResultsDTO[]): PatientInput[] {
  const patientsById = new Map<string, PatientInput>();

  for (const resultSet of labResults) {
    // we assume all patient data in one batch is the same,
    // even if it's not - there's no way to detect which one is more fresh anyway
    if (patientsById.has(resultSet.client_id)) continue;

    patientsById.set(resultSet.client_id, {
      id: resultSet.client_id,
      birthdate: resultSet.date_birthdate,
      gender: resultSet.gender,
      ethnicity: resultSet.ethnicity
    });
  }

  return Array.from(patientsById.values());
}

async function upsertPatient(tx: PrismaTransactionClient, patient: PatientInput): Promise<void> {
  const { id, ...demographics } = patient;

  await tx.patient.upsert({
    where: { id },
    create: patient,
    update: demographics
  });
}

async function upsertLabResults(
  tx: PrismaTransactionClient,
  resultSet: LabResultsDTO
): Promise<void> {
  const input = toLabResultsCreateInput(resultSet);
  const { patientId, date, ...values } = input;

  await tx.labResult.upsert({
    where: {
      patientId_date: {
        patientId,
        date
      }
    },
    create: input,
    update: values
  });
}
