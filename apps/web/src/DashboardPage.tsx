import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { trpc } from '@web/lib/trpc';
import { cn } from '@web/lib/utils';
import { type ComponentProps, type UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import type {
  GroupedLabResultsRow,
  TimeSeriesLabResultRow
} from './types/trpc-types';

const TIME_SERIES_PAGE_LIMIT = 100;
const GROUPED_LAB_RESULTS_PAGE_LIMIT = 100;
const LAB_RESULT_ROW_HEIGHT = 48;
const LAB_RESULTS_SCROLL_END_PADDING = 96;
const SCROLL_TO_TOP_THRESHOLD = LAB_RESULT_ROW_HEIGHT * 8;
const TIME_SERIES_TABLE_MIN_WIDTH_CLASS = 'min-w-[1456px]';
const GROUPED_TABLE_MIN_WIDTH_CLASS = 'min-w-[1008px]';
const TIME_SERIES_GRID_CLASS =
  'grid grid-cols-[7rem_10rem_7rem_5rem_6rem_repeat(7,minmax(8rem,1fr))] items-center';
const GROUPED_GRID_CLASS = 'grid grid-cols-[7rem_repeat(7,minmax(8rem,1fr))] items-center';
const NEW_DATA_PATIENT_OPTIONS = [10, 20, 50, 200] as const;
const LAB_RESULTS_VIEW_OPTIONS = [
  { value: 'timeSeries', label: 'Time series' },
  { value: 'byPatient', label: 'By patient' }
] as const;
// General adult CMP/BMP reference ranges. Lab-specific ranges can vary.
const LAB_VALUE_REFERENCE_RANGES = {
  creatine: { min: 0.6, max: 1.3 },
  chloride: { min: 96, max: 106 },
  fastingGlucose: { min: 70, max: 100 },
  potassium: { min: 3.7, max: 5.2 },
  sodium: { min: 135, max: 145 },
  totalCalcium: { min: 8.5, max: 10.2 },
  totalProtein: { min: 6.0, max: 8.3 }
} as const;
type NewDataPatients = (typeof NEW_DATA_PATIENT_OPTIONS)[number];
type LabResultsView = (typeof LAB_RESULTS_VIEW_OPTIONS)[number]['value'];
type LabValueRange =
  (typeof LAB_VALUE_REFERENCE_RANGES)[keyof typeof LAB_VALUE_REFERENCE_RANGES];

export function DashboardPage() {
  const queryClient = useQueryClient();
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [labResultsView, setLabResultsView] = useState<LabResultsView>('timeSeries');
  const [newDataPatients, setNewDataPatients] = useState<NewDataPatients>(10);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const timeSeriesQuery = useInfiniteQuery(
    trpc.labResults.timeSeries.infiniteQueryOptions(
      { limit: TIME_SERIES_PAGE_LIMIT },
      {
        enabled: labResultsView === 'timeSeries',
        initialCursor: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor
      }
    )
  );
  const byPatientQuery = useInfiniteQuery(
    trpc.labResults.byPatient.infiniteQueryOptions(
      { limit: GROUPED_LAB_RESULTS_PAGE_LIMIT },
      {
        enabled: labResultsView === 'byPatient',
        initialCursor: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor
      }
    )
  );
  const statsQuery = useQuery(trpc.labResults.stats.queryOptions());
  const activeQuery =
    labResultsView === 'timeSeries'
      ? {
          error: timeSeriesQuery.error,
          fetchNextPage: timeSeriesQuery.fetchNextPage,
          hasNextPage: timeSeriesQuery.hasNextPage,
          isError: timeSeriesQuery.isError,
          isFetching: timeSeriesQuery.isFetching,
          isFetchingNextPage: timeSeriesQuery.isFetchingNextPage,
          isPending: timeSeriesQuery.isPending
        }
      : {
          error: byPatientQuery.error,
          fetchNextPage: byPatientQuery.fetchNextPage,
          hasNextPage: byPatientQuery.hasNextPage,
          isError: byPatientQuery.isError,
          isFetching: byPatientQuery.isFetching,
          isFetchingNextPage: byPatientQuery.isFetchingNextPage,
          isPending: byPatientQuery.isPending
        };
  const isFetchingLabResults = activeQuery.isFetching;

  const invalidateLabResults = async () => {
    await Promise.all([
      queryClient.invalidateQueries(trpc.labResults.timeSeries.pathFilter()),
      queryClient.invalidateQueries(trpc.labResults.byPatient.pathFilter()),
      queryClient.invalidateQueries(trpc.labResults.stats.queryFilter())
    ]);
  };

  const resetLabResults = useMutation(
    trpc.labResults.reset.mutationOptions({
      onSuccess: invalidateLabResults
    })
  );

  const addNewData = useMutation(
    trpc.labResults.addNewData.mutationOptions({
      onSuccess: invalidateLabResults
    })
  );
  const isMutatingLabResults = resetLabResults.isPending || addNewData.isPending;
  const showLoadingIndicator = isFetchingLabResults || isMutatingLabResults;

  const timeSeriesRows = useMemo(() => {
    return timeSeriesQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  }, [timeSeriesQuery.data]);

  const groupedRows = useMemo(() => {
    return byPatientQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  }, [byPatientQuery.data]);

  const rows = labResultsView === 'timeSeries' ? timeSeriesRows : groupedRows;
  const gridClass = labResultsView === 'timeSeries' ? TIME_SERIES_GRID_CLASS : GROUPED_GRID_CLASS;
  const columnCount = labResultsView === 'timeSeries' ? 12 : 8;

  const virtualRowCount = activeQuery.hasNextPage ? rows.length + 1 : rows.length;
  const rowVirtualizer = useVirtualizer({
    count: virtualRowCount,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => LAB_RESULT_ROW_HEIGHT,
    overscan: 10,
    useFlushSync: false
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    scrollParentRef.current?.scrollTo({ top: 0 });
    setShowScrollToTop(false);
  }, [labResultsView]);

  const handleLabResultsScroll = (event: UIEvent<HTMLDivElement>) => {
    const shouldShow = event.currentTarget.scrollTop > SCROLL_TO_TOP_THRESHOLD;

    setShowScrollToTop((isVisible) => (isVisible === shouldShow ? isVisible : shouldShow));
  };

  const handleScrollToTop = () => {
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    scrollParentRef.current?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  };

  useEffect(() => {
    const lastVirtualRow = virtualRows.at(-1);
    if (!lastVirtualRow) return;
    if (
      lastVirtualRow.index >= rows.length - 1 &&
      activeQuery.hasNextPage &&
      !activeQuery.isFetchingNextPage
    ) {
      void activeQuery.fetchNextPage();
    }
  }, [
    activeQuery.fetchNextPage,
    activeQuery.hasNextPage,
    activeQuery.isFetchingNextPage,
    rows.length,
    virtualRows
  ]);

  useEffect(() => {
    if (!timeSeriesQuery.isSuccess && !byPatientQuery.isSuccess) return;

    void queryClient.invalidateQueries(trpc.labResults.stats.queryFilter());
  }, [
    byPatientQuery.dataUpdatedAt,
    byPatientQuery.isSuccess,
    queryClient,
    timeSeriesQuery.dataUpdatedAt,
    timeSeriesQuery.isSuccess
  ]);

  return (
    <main className="bg-background text-foreground min-h-screen p-4">
      <style>
        {`
          @keyframes ino-loading-bar {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(320%); }
          }

          @media (prefers-reduced-motion: reduce) {
            .ino-loading-bar {
              animation: none !important;
              transform: translateX(0) !important;
              width: 100% !important;
            }
          }
        `}
      </style>
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/10 transition-opacity duration-200',
          showLoadingIndicator ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden={!showLoadingIndicator}
      >
        <div
          className="ino-loading-bar h-full w-1/3 rounded-r-full bg-primary/80 shadow-lg"
          style={{ animation: 'ino-loading-bar 1.1s ease-in-out infinite' }}
        />
      </div>
      {showLoadingIndicator ? <span className="sr-only">Loading lab results</span> : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div
          className="border-input bg-muted/30 flex rounded-md border p-0.5"
          role="group"
          aria-label="Lab results view"
        >
          {LAB_RESULTS_VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={labResultsView === option.value}
              disabled={isMutatingLabResults}
              onClick={() => setLabResultsView(option.value)}
              className={cn(
                'disabled:pointer-events-none disabled:opacity-50 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                labResultsView === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label htmlFor="new-data-patients" className="sr-only">
          Patients to add
        </label>
        <select
          id="new-data-patients"
          value={newDataPatients}
          disabled={isMutatingLabResults}
          onChange={(event) => setNewDataPatients(Number(event.target.value) as NewDataPatients)}
          className="border-input bg-background disabled:pointer-events-none disabled:opacity-50 rounded-md border px-3 py-2 text-sm font-medium"
        >
          {NEW_DATA_PATIENT_OPTIONS.map((patients) => (
            <option key={patients} value={patients}>
              {patients}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isMutatingLabResults}
          onClick={() => addNewData.mutate({ patients: newDataPatients })}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 rounded-md px-3 py-2 text-sm font-medium"
        >
          add new data
        </button>
        <div className="text-muted-foreground ml-auto flex gap-3 text-sm">
          <span>{statsQuery.data?.patients ?? '-'} patients</span>
          <span>{statsQuery.data?.labResults ?? '-'} results</span>
        </div>
        <button
          type="button"
          disabled={isMutatingLabResults}
          onClick={() => resetLabResults.mutate()}
          className="border-destructive/50 text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 rounded-md border bg-transparent px-3 py-2 text-sm font-medium"
        >
          reset
        </button>
      </div>

      <div className="relative">
        <div
          ref={scrollParentRef}
          className="border-border h-[calc(100vh-5.5rem)] overflow-auto rounded-md border"
          onScroll={handleLabResultsScroll}
        >
          <div
            className={
              labResultsView === 'timeSeries'
                ? TIME_SERIES_TABLE_MIN_WIDTH_CLASS
                : GROUPED_TABLE_MIN_WIDTH_CLASS
            }
            role="table"
            aria-rowcount={
              labResultsView === 'timeSeries' ? statsQuery.data?.labResults : undefined
            }
          >
            <div
              className={cn(
                gridClass,
                'bg-background sticky top-0 z-10 border-b text-sm font-medium'
              )}
              role="row"
            >
              <HeaderCell>Test date</HeaderCell>
              {labResultsView === 'timeSeries' ? (
                <>
                  <HeaderCell>Patient ID</HeaderCell>
                  <HeaderCell>Birthdate</HeaderCell>
                  <HeaderCell>Gender</HeaderCell>
                  <HeaderCell>Ethnicity</HeaderCell>
                </>
              ) : null}
              <HeaderCell>Creatine</HeaderCell>
              <HeaderCell>Chloride</HeaderCell>
              <HeaderCell>Glucose</HeaderCell>
              <HeaderCell>Potassium</HeaderCell>
              <HeaderCell>Sodium</HeaderCell>
              <HeaderCell>Calcium</HeaderCell>
              <HeaderCell>Protein</HeaderCell>
            </div>

            {activeQuery.isPending ? (
              <StateBlock>Loading lab results...</StateBlock>
            ) : activeQuery.isError && rows.length === 0 ? (
              <StateBlock>{activeQuery.error?.message ?? 'Failed to load lab results.'}</StateBlock>
            ) : rows.length === 0 ? (
              <StateBlock>No lab results found.</StateBlock>
            ) : (
              <div
                className="relative"
                style={{
                  height: `${rowVirtualizer.getTotalSize() + LAB_RESULTS_SCROLL_END_PADDING}px`
                }}
                role="rowgroup"
              >
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];

                  if (!row) {
                    return (
                      <VirtualRow
                        key={virtualRow.key}
                        gridClass={gridClass}
                        start={virtualRow.start}
                      >
                        <div
                          className="text-muted-foreground px-3 py-3 text-sm"
                          style={{ gridColumn: `span ${columnCount} / span ${columnCount}` }}
                        >
                          {labResultsView === 'timeSeries'
                            ? 'Loading more lab results...'
                            : 'Loading more patient results...'}
                        </div>
                      </VirtualRow>
                    );
                  }

                  if (isGroupedDisplayRow(row)) {
                    return row.kind === 'patient' ? (
                      <PatientGroupVirtualRow
                        key={`patient:${row.patient.id}`}
                        row={row}
                        start={virtualRow.start}
                      />
                    ) : (
                      <GroupedLabResultVirtualRow
                        key={`labResult:${row.labResult.id}`}
                        row={row}
                        start={virtualRow.start}
                      />
                    );
                  }

                  return (
                    <TimeSeriesLabResultVirtualRow
                      key={row.id}
                      row={row}
                      start={virtualRow.start}
                    />
                  );
                })}
              </div>
            )}

            {activeQuery.isError && rows.length > 0 ? (
              <div className="text-destructive border-t px-3 py-3 text-sm">
                {activeQuery.error?.message ?? 'Failed to load lab results.'}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          aria-label="Scroll lab results to top"
          title="Scroll to top"
          onClick={handleScrollToTop}
          className={cn(
            'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 absolute right-4 bottom-4 z-20 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg shadow-black/20 transition-all duration-300 focus-visible:ring-[3px] focus-visible:outline-none',
            showScrollToTop
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-4 opacity-0'
          )}
        >
          <svg
            aria-hidden="true"
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
          Scroll to top
        </button>
      </div>
    </main>
  );
}

function isGroupedDisplayRow(
  row: TimeSeriesLabResultRow | GroupedLabResultsRow
): row is GroupedLabResultsRow {
  return 'kind' in row;
}

function TimeSeriesLabResultVirtualRow({
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
      <LabValueCell
        value={row.creatine}
        unit={row.creatineUnit}
        range={LAB_VALUE_REFERENCE_RANGES.creatine}
      />
      <LabValueCell
        value={row.chloride}
        unit={row.chlorideUnit}
        range={LAB_VALUE_REFERENCE_RANGES.chloride}
      />
      <LabValueCell
        value={row.fastingGlucose}
        unit={row.fastingGlucoseUnit}
        range={LAB_VALUE_REFERENCE_RANGES.fastingGlucose}
      />
      <LabValueCell
        value={row.potassium}
        unit={row.potassiumUnit}
        range={LAB_VALUE_REFERENCE_RANGES.potassium}
      />
      <LabValueCell
        value={row.sodium}
        unit={row.sodiumUnit}
        range={LAB_VALUE_REFERENCE_RANGES.sodium}
      />
      <LabValueCell
        value={row.totalCalcium}
        unit={row.totalCalciumUnit}
        range={LAB_VALUE_REFERENCE_RANGES.totalCalcium}
      />
      <LabValueCell
        value={row.totalProtein}
        unit={row.totalProteinUnit}
        range={LAB_VALUE_REFERENCE_RANGES.totalProtein}
      />
    </VirtualRow>
  );
}

function PatientGroupVirtualRow({
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
        style={{ gridColumn: 'span 8 / span 8' }}
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

function GroupedLabResultVirtualRow({
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
      <LabValueCell
        value={labResult.creatine}
        unit={labResult.creatineUnit}
        range={LAB_VALUE_REFERENCE_RANGES.creatine}
      />
      <LabValueCell
        value={labResult.chloride}
        unit={labResult.chlorideUnit}
        range={LAB_VALUE_REFERENCE_RANGES.chloride}
      />
      <LabValueCell
        value={labResult.fastingGlucose}
        unit={labResult.fastingGlucoseUnit}
        range={LAB_VALUE_REFERENCE_RANGES.fastingGlucose}
      />
      <LabValueCell
        value={labResult.potassium}
        unit={labResult.potassiumUnit}
        range={LAB_VALUE_REFERENCE_RANGES.potassium}
      />
      <LabValueCell
        value={labResult.sodium}
        unit={labResult.sodiumUnit}
        range={LAB_VALUE_REFERENCE_RANGES.sodium}
      />
      <LabValueCell
        value={labResult.totalCalcium}
        unit={labResult.totalCalciumUnit}
        range={LAB_VALUE_REFERENCE_RANGES.totalCalcium}
      />
      <LabValueCell
        value={labResult.totalProtein}
        unit={labResult.totalProteinUnit}
        range={LAB_VALUE_REFERENCE_RANGES.totalProtein}
      />
    </VirtualRow>
  );
}

function VirtualRow({
  className,
  children,
  gridClass,
  start
}: {
  className?: string;
  children: ComponentProps<'div'>['children'];
  gridClass: string;
  start: number;
}) {
  return (
    <div
      className={cn(
        gridClass,
        'hover:bg-muted/50 absolute top-0 left-0 h-12 w-full border-b text-sm transition-colors',
        className
      )}
      role="row"
      style={{ transform: `translateY(${start}px)` }}
    >
      {children}
    </div>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <div
      className="text-foreground h-10 px-3 py-2 text-left align-middle whitespace-nowrap"
      role="columnheader"
    >
      {children}
    </div>
  );
}

function GridCell({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-3 py-3 whitespace-nowrap', className)} role="cell" {...props} />;
}

function StateBlock({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
      {children}
    </div>
  );
}

function getLabValueBoundStatus(value: TimeSeriesLabResultRow['creatine'], range: LabValueRange) {
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
  value: TimeSeriesLabResultRow['creatine'];
  unit: string;
}) {
  const boundStatus = getLabValueBoundStatus(value, range);
  const valueLabel = `${value.toString()} ${unit}`;
  const rangeLabel = `${range.min}-${range.max} ${unit}`;

  return (
    <GridCell
      aria-label={
        boundStatus ? `${valueLabel}, ${boundStatus}, expected ${rangeLabel}` : undefined
      }
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
