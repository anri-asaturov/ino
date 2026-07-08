import type { Prisma } from '../../../generated/prisma/client.js';

export const labResultSelect = {
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
} satisfies Prisma.LabResultSelect;

export const patientSelect = {
  id: true,
  birthdate: true,
  gender: true,
  ethnicity: true
} satisfies Prisma.PatientSelect;

const patientWithLabResultCountSelect = {
  ...patientSelect,
  _count: {
    select: {
      labResults: true
    }
  }
} satisfies Prisma.PatientSelect;

export const groupedLabResultSelect = {
  ...labResultSelect,
  patientId: true,
  patient: {
    select: patientWithLabResultCountSelect
  }
} satisfies Prisma.LabResultSelect;

export type GroupedLabResult = Prisma.LabResultGetPayload<{
  select: typeof groupedLabResultSelect;
}>;

export type GroupedPatient = Prisma.PatientGetPayload<{ select: typeof patientSelect }>;
