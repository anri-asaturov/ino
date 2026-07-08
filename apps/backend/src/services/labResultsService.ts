import { db } from '../db.js';

export const DEFAULT_PATIENTS_RET = 10;
export const MAX_PATIENTS_RET = 100;

export function getAll(patients = DEFAULT_PATIENTS_RET) {
  if (!Number.isInteger(patients) || patients < 1 || patients > MAX_PATIENTS_RET) {
    throw new RangeError(`patients must be an integer between 1 and ${MAX_PATIENTS_RET}`);
  }

  return db.patient.findMany({
    where: {
      labResults: {
        some: {}
      }
    },
    take: patients,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    include: {
      labResults: {
        orderBy: [{ date: 'desc' }, { id: 'asc' }]
      }
    }
  });
}

export async function resetAll() {
  await db.$transaction(async (tx) => {
    await tx.labResult.deleteMany();
    await tx.patient.deleteMany();
  });
}
