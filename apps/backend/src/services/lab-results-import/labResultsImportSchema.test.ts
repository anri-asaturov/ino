import { describe, expect, it } from 'vitest';
import { labResultsImportResponseSchema } from './labResultsImportSchema.js';

const labResultsImportResponseFixture = [
  {
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
  },
  {
    client_id: 'b7e289cd',
    date_testing: '2018-11-26',
    date_birthdate: '1950-01-01',
    gender: 1,
    ethnicity: 2,
    creatine: 1.5,
    chloride: 119.3,
    fasting_glucose: 121.89,
    potassium: 6.48,
    sodium: 90.88,
    total_calcium: 10.78,
    total_protein: 8.45,
    creatine_unit: 'mgdl',
    chloride_unit: 'mmoll',
    fasting_glucose_unit: 'mgdl',
    potassium_unit: 'mmoll',
    sodium_unit: 'ul',
    total_calcium_unit: 'mgdl',
    total_protein_unit: 'gdl'
  },
  {
    client_id: 'b7e289cd',
    date_testing: '2018-12-02',
    date_birthdate: '1950-01-01',
    gender: 1,
    ethnicity: 2,
    creatine: 0.93,
    chloride: 99.24,
    fasting_glucose: 70.17,
    potassium: 1.69,
    sodium: 109.44,
    total_calcium: 7.89,
    total_protein: 5.76,
    creatine_unit: 'mgdl',
    chloride_unit: 'mmoll',
    fasting_glucose_unit: 'mgdl',
    potassium_unit: 'mmoll',
    sodium_unit: 'ul',
    total_calcium_unit: 'mgdl',
    total_protein_unit: 'gdl'
  },
  {
    client_id: 'b7e289cd',
    date_testing: '2020-06-23',
    date_birthdate: '1950-01-01',
    gender: 1,
    ethnicity: 2,
    creatine: 1.23,
    chloride: 83.12,
    fasting_glucose: 119.92,
    potassium: 8.36,
    sodium: 137.28,
    total_calcium: 12.12,
    total_protein: 9.12,
    creatine_unit: 'mgdl',
    chloride_unit: 'mmoll',
    fasting_glucose_unit: 'mgdl',
    potassium_unit: 'mmoll',
    sodium_unit: 'ul',
    total_calcium_unit: 'mgdl',
    total_protein_unit: 'gdl'
  }
];

describe('labResultsImportResponseSchema', () => {
  it('accepts lab result payloads from the import API', () => {
    const parsed = labResultsImportResponseSchema.safeParse(labResultsImportResponseFixture);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw parsed.error;

    expect(parsed.data).toHaveLength(4);
    expect(parsed.data[0]).toMatchObject({
      client_id: 'b7e289cd',
      date_testing: '2018-03-20',
      date_birthdate: '1950-01-01',
      gender: 1,
      ethnicity: 2
    });
  });

  it('accepts an empty response', () => {
    expect(labResultsImportResponseSchema.safeParse([]).success).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    const parsed = labResultsImportResponseSchema.safeParse([
      {
        ...labResultsImportResponseFixture[0]!,
        date_testing: '2021-02-29'
      }
    ]);

    expect(parsed.success).toBe(false);
  });
});
