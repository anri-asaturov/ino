import type { ApiRouter } from '@ino/backend';
import type { inferRouterOutputs } from '@trpc/server';

export type TimeSeriesLabResultsPage = inferRouterOutputs<ApiRouter>['labResults']['timeSeries'];
export type TimeSeriesLabResultRow = TimeSeriesLabResultsPage['rows'][number];
export type GroupedLabResultsPage = inferRouterOutputs<ApiRouter>['labResults']['byPatient'];
export type GroupedLabResultsRow = GroupedLabResultsPage['rows'][number];
export type GroupedLabResultRow = Extract<GroupedLabResultsRow, { kind: 'labResult' }>['labResult'];
