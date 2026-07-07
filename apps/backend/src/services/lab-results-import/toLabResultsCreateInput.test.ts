import { describe, expect, it } from 'vitest';
import type { LabResultsDTO } from './labResultsImportSchema.js';
import { toLabResultsCreateInput } from './toLabResultsCreateInput.js';

describe('toLabResultsCreateInput', () => {
  it('maps import API fields to Prisma create input fields', () => {
    const resultSet = {
      client_id: 'b7e289cd',
      date_testing: '2018-03-20',
      date_birthdate: '1950-01-01',
      gender: 1,
      ethnicity: 2,
      creatine: 0.82,
      chloride: 102.06,
      fasting_glucose: 117.85,
      potassium: 8.33,
      sodium: 121.3,
      total_calcium: 10.04,
      total_protein: 7.91,
      creatine_unit: 'mgdl',
      chloride_unit: 'mmoll',
      fasting_glucose_unit: 'mgdl',
      potassium_unit: 'mmoll',
      sodium_unit: 'ul',
      total_calcium_unit: 'mgdl',
      total_protein_unit: 'gdl'
    } satisfies LabResultsDTO;

    expect(toLabResultsCreateInput(resultSet)).toEqual({
      patientId: 'b7e289cd',
      date: '2018-03-20',
      creatine: '0.82',
      chloride: '102.06',
      fastingGlucose: '117.85',
      potassium: '8.33',
      sodium: '121.3',
      totalCalcium: '10.04',
      totalProtein: '7.91',
      creatineUnit: 'mgdl',
      chlorideUnit: 'mmoll',
      fastingGlucoseUnit: 'mgdl',
      potassiumUnit: 'mmoll',
      sodiumUnit: 'ul',
      totalCalciumUnit: 'mgdl',
      totalProteinUnit: 'gdl'
    });
  });
});
