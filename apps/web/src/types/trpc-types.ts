import type { ApiRouter } from '@ino/backend';
import type { inferRouterOutputs } from '@trpc/server';

export type LabResultsOutput = inferRouterOutputs<ApiRouter>['labResults']['get'];
export type Patient = LabResultsOutput[number];
export type LabResult = Patient['labResults'][number];
