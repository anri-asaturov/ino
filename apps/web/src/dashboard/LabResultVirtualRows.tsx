import type { GroupedLabResultsRow, TimeSeriesLabResultRow } from '../types/trpc-types';
import {
  GROUPED_COLUMN_COUNT,
  GROUPED_GRID_CLASS,
  TIME_SERIES_GRID_CLASS
} from './labResultsConfig';
import { GridCell, VirtualRow } from './LabResultsGrid';
import { LabValueCells } from './LabValueCells';

export type LabResultsDisplayRow = TimeSeriesLabResultRow | GroupedLabResultsRow;

export function isGroupedDisplayRow(row: LabResultsDisplayRow): row is GroupedLabResultsRow {
  return 'kind' in row;
}

export function TimeSeriesLabResultVirtualRow({
  row,
  start
}: {
  row: TimeSeriesLabResultRow;
  start: number;
}) {
  return (
    <VirtualRow gridClass={TIME_SERIES_GRID_CLASS} start={start}>
      <GridCell>{row.date}</GridCell>
      <GridCell className="font-mono text-xs">{row.patient.id}</GridCell>
      <GridCell>{row.patient.birthdate}</GridCell>
      <GridCell>{row.patient.gender}</GridCell>
      <GridCell>{row.patient.ethnicity}</GridCell>
      <LabValueCells source={row} />
    </VirtualRow>
  );
}

export function PatientGroupVirtualRow({
  row,
  start
}: {
  row: Extract<GroupedLabResultsRow, { kind: 'patient' }>;
  start: number;
}) {
  return (
    <VirtualRow
      gridClass={GROUPED_GRID_CLASS}
      start={start}
      className="bg-muted/40 hover:bg-muted/60"
    >
      <div
        className="flex items-center gap-4 px-3 py-3 text-sm whitespace-nowrap"
        role="cell"
        style={{ gridColumn: `span ${GROUPED_COLUMN_COUNT} / span ${GROUPED_COLUMN_COUNT}` }}
      >
        <span className="font-medium">Patient</span>
        <span className="font-mono text-xs">{row.patient.id}</span>
        <span className="text-muted-foreground">{row.patient.birthdate}</span>
        <span className="text-muted-foreground">gender {row.patient.gender}</span>
        <span className="text-muted-foreground">ethnicity {row.patient.ethnicity}</span>
        <span className="text-muted-foreground ml-auto">{row.labResultCount} results</span>
      </div>
    </VirtualRow>
  );
}

export function GroupedLabResultVirtualRow({
  row,
  start
}: {
  row: Extract<GroupedLabResultsRow, { kind: 'labResult' }>;
  start: number;
}) {
  const { labResult } = row;

  return (
    <VirtualRow gridClass={GROUPED_GRID_CLASS} start={start}>
      <GridCell>{labResult.date}</GridCell>
      <LabValueCells source={labResult} />
    </VirtualRow>
  );
}
