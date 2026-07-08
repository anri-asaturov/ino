import type { Prisma } from '../../../generated/prisma/client.js';
import { db, type PrismaTransactionClient } from '../../db.js';
import type { LabResultsDTO } from './labResultsImportSchema.js';
import { toLabResultsCreateInput } from './toLabResultsCreateInput.js';

type PatientInput = Prisma.PatientCreateManyInput;

export async function saveLabResults(labResults: LabResultsDTO[]): Promise<void> {
  if (labResults.length === 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    for (const patient of getPatientInputs(labResults)) {
      await upsertPatient(tx, patient);
    }

    for (const resultSet of labResults) {
      await upsertLabResults(tx, resultSet);
    }
  });
}

// Import batches can contain multiple patient IDs, so dedupe before upsert.
function getPatientInputs(labResults: LabResultsDTO[]): PatientInput[] {
  const patientsById = new Map<string, PatientInput>();

  for (const resultSet of labResults) {
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
