import type { Prisma } from '../../../generated/prisma/client.js';
import type { LabResultsDTO } from './labResultsImportSchema.js';

export function toLabResultsCreateInput(resultSet: LabResultsDTO): Prisma.LabResultCreateManyInput {
  return {
    patientId: resultSet.client_id,
    date: resultSet.date_testing,
    creatine: decimalToString(resultSet.creatine),
    chloride: decimalToString(resultSet.chloride),
    fastingGlucose: decimalToString(resultSet.fasting_glucose),
    potassium: decimalToString(resultSet.potassium),
    sodium: decimalToString(resultSet.sodium),
    totalCalcium: decimalToString(resultSet.total_calcium),
    totalProtein: decimalToString(resultSet.total_protein),
    creatineUnit: resultSet.creatine_unit,
    chlorideUnit: resultSet.chloride_unit,
    fastingGlucoseUnit: resultSet.fasting_glucose_unit,
    potassiumUnit: resultSet.potassium_unit,
    sodiumUnit: resultSet.sodium_unit,
    totalCalciumUnit: resultSet.total_calcium_unit,
    totalProteinUnit: resultSet.total_protein_unit
  };
}

// Prisma accepts decimal values as strings, which keeps insert values decimal-shaped.
function decimalToString(value: number): string {
  return String(value);
}
