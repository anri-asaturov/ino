import type { ApiRouter } from '../../apps/backend/api-types';
import type { inferRouterOutputs } from '@trpc/server';

export const TIME_SERIES_PAGE_LIMIT = 100;
export const GROUPED_LAB_RESULTS_PAGE_LIMIT = 100;
export const NEW_DATA_PATIENT_OPTIONS = [10, 20, 50, 200] as const;

export type NewDataPatients = (typeof NEW_DATA_PATIENT_OPTIONS)[number];
export type LabResultsView = 'timeSeries' | 'byPatient';

type RouterOutputs = inferRouterOutputs<ApiRouter>;

export type TimeSeriesLabResultsPage = RouterOutputs['labResults']['timeSeries'];
export type GroupedLabResultsPage = RouterOutputs['labResults']['byPatient'];
export type TimeSeriesLabResultRow = TimeSeriesLabResultsPage['rows'][number];
export type GroupedLabResultsRow = GroupedLabResultsPage['rows'][number];
export type LabResult = Extract<GroupedLabResultsRow, { kind: 'labResult' }>['labResult'];
export type LabValue = TimeSeriesLabResultRow['creatine'];

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function getLabValueNumber(value: LabValue) {
  const numericValue = Number(value.toString());

  return Number.isFinite(numericValue) ? numericValue : null;
}
