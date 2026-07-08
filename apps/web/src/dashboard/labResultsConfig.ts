import type { TimeSeriesLabResultRow } from '../types/trpc-types';

export const TIME_SERIES_PAGE_LIMIT = 100;
export const GROUPED_LAB_RESULTS_PAGE_LIMIT = 100;
export const LAB_RESULT_ROW_HEIGHT = 48;
export const LAB_RESULTS_SCROLL_END_PADDING = 96;
export const SCROLL_TO_TOP_THRESHOLD = LAB_RESULT_ROW_HEIGHT * 8;
// Grid templates must stay literal so Tailwind generates the classes; keep the
// repeat(7, ...) analyte columns in sync with LAB_VALUE_COLUMNS.
export const TIME_SERIES_TABLE_MIN_WIDTH_CLASS = 'min-w-[1456px]';
export const GROUPED_TABLE_MIN_WIDTH_CLASS = 'min-w-[1008px]';
export const TIME_SERIES_GRID_CLASS =
  'grid grid-cols-[7rem_10rem_7rem_5rem_6rem_repeat(7,minmax(8rem,1fr))] items-center';
export const GROUPED_GRID_CLASS = 'grid grid-cols-[7rem_repeat(7,minmax(8rem,1fr))] items-center';
export const NEW_DATA_PATIENT_OPTIONS = [10, 20, 50, 200] as const;
export const LAB_RESULTS_VIEW_OPTIONS = [
  { value: 'timeSeries', label: 'Time series' },
  { value: 'byPatient', label: 'By patient' }
] as const;
// General adult CMP/BMP reference ranges. Lab-specific ranges can vary.
export const LAB_VALUE_COLUMNS = [
  { key: 'creatine', label: 'Creatine', range: { min: 0.6, max: 1.3 } },
  { key: 'chloride', label: 'Chloride', range: { min: 96, max: 106 } },
  { key: 'fastingGlucose', label: 'Glucose', range: { min: 70, max: 100 } },
  { key: 'potassium', label: 'Potassium', range: { min: 3.7, max: 5.2 } },
  { key: 'sodium', label: 'Sodium', range: { min: 135, max: 145 } },
  { key: 'totalCalcium', label: 'Calcium', range: { min: 8.5, max: 10.2 } },
  { key: 'totalProtein', label: 'Protein', range: { min: 6.0, max: 8.3 } }
] as const;
export const TIME_SERIES_COLUMN_COUNT = 5 + LAB_VALUE_COLUMNS.length;
export const GROUPED_COLUMN_COUNT = 1 + LAB_VALUE_COLUMNS.length;

export type NewDataPatients = (typeof NEW_DATA_PATIENT_OPTIONS)[number];
export type LabResultsView = (typeof LAB_RESULTS_VIEW_OPTIONS)[number]['value'];
export type LabValueKey = (typeof LAB_VALUE_COLUMNS)[number]['key'];
export type LabValueRange = (typeof LAB_VALUE_COLUMNS)[number]['range'];
export type LabValueSource = Pick<TimeSeriesLabResultRow, LabValueKey | `${LabValueKey}Unit`>;
