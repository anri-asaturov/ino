import {
  LAB_VALUE_COLUMNS,
  type LabValueKey,
  type LabValueRange,
  type LabValueSource
} from './labResultsConfig';
import { GridCell } from './LabResultsGrid';

export function LabValueCells({ source }: { source: LabValueSource }) {
  return (
    <>
      {LAB_VALUE_COLUMNS.map((column) => (
        <LabValueCell
          key={column.key}
          value={source[column.key]}
          unit={source[`${column.key}Unit`]}
          range={column.range}
        />
      ))}
    </>
  );
}

function getLabValueBoundStatus(value: LabValueSource[LabValueKey], range: LabValueRange) {
  const numericValue = Number(value.toString());

  if (!Number.isFinite(numericValue)) return null;
  if (numericValue < range.min) return 'low';
  if (numericValue > range.max) return 'high';

  return null;
}

function LabValueCell({
  range,
  value,
  unit
}: {
  range: LabValueRange;
  value: LabValueSource[LabValueKey];
  unit: string;
}) {
  const boundStatus = getLabValueBoundStatus(value, range);
  const valueLabel = `${value.toString()} ${unit}`;
  const rangeLabel = `${range.min}-${range.max} ${unit}`;

  return (
    <GridCell
      aria-label={boundStatus ? `${valueLabel}, ${boundStatus}, expected ${rangeLabel}` : undefined}
      title={boundStatus ? `Expected ${rangeLabel}` : undefined}
    >
      <span className="font-medium">{value.toString()}</span>{' '}
      <span className="text-muted-foreground">{unit}</span>
      {boundStatus ? (
        <span className="text-muted-foreground/55 pointer-events-none ml-1 inline-flex align-[-0.15em]">
          <svg
            aria-hidden="true"
            className="size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {boundStatus === 'high' ? (
              <>
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </>
            ) : (
              <>
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </>
            )}
          </svg>
        </span>
      ) : null}
    </GridCell>
  );
}
