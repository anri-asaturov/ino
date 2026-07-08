import type { GroupedLabResult, GroupedPatient } from './labResultSelects.js';

type GroupedLabResultRow = Omit<GroupedLabResult, 'patient' | 'patientId'>;

export type GroupedLabResultsRow =
  | {
      kind: 'patient';
      labResultCount: number;
      patient: GroupedPatient;
    }
  | {
      kind: 'labResult';
      patient: GroupedPatient;
      labResult: GroupedLabResultRow;
    };

export function toGroupedRows(
  labResults: GroupedLabResult[],
  cursorPatientId: string | null
): GroupedLabResultsRow[] {
  const rows: GroupedLabResultsRow[] = [];
  let previousPatientId = cursorPatientId;

  for (const result of labResults) {
    const { patient, patientId, ...labResult } = result;
    const { _count, ...patientWithoutCount } = patient;

    if (patientId !== previousPatientId) {
      rows.push({
        kind: 'patient',
        labResultCount: _count.labResults,
        patient: patientWithoutCount
      });
    }

    rows.push({
      kind: 'labResult',
      patient: patientWithoutCount,
      labResult
    });
    previousPatientId = patientId;
  }

  return rows;
}
