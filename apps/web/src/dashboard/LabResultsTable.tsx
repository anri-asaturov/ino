import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@web/lib/utils';
import { type UIEvent, useEffect, useRef, useState } from 'react';
import {
  GROUPED_COLUMN_COUNT,
  GROUPED_GRID_CLASS,
  GROUPED_TABLE_MIN_WIDTH_CLASS,
  LAB_RESULTS_SCROLL_END_PADDING,
  LAB_RESULT_ROW_HEIGHT,
  LAB_VALUE_COLUMNS,
  SCROLL_TO_TOP_THRESHOLD,
  TIME_SERIES_COLUMN_COUNT,
  TIME_SERIES_GRID_CLASS,
  TIME_SERIES_TABLE_MIN_WIDTH_CLASS,
  type LabResultsView
} from './labResultsConfig';
import { HeaderCell, StateBlock, VirtualRow } from './LabResultsGrid';
import {
  GroupedLabResultVirtualRow,
  type LabResultsDisplayRow,
  PatientGroupVirtualRow,
  TimeSeriesLabResultVirtualRow,
  isGroupedDisplayRow
} from './LabResultVirtualRows';

type LabResultsQueryState = {
  isPending: boolean;
  isError: boolean;
  error: { message?: string } | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
};

type LabResultsTableProps = {
  labResultsView: LabResultsView;
  activeQuery: LabResultsQueryState;
  rows: LabResultsDisplayRow[];
  labResultsCount?: number;
};

export function LabResultsTable({
  labResultsView,
  activeQuery,
  rows,
  labResultsCount
}: LabResultsTableProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const gridClass = labResultsView === 'timeSeries' ? TIME_SERIES_GRID_CLASS : GROUPED_GRID_CLASS;
  const columnCount =
    labResultsView === 'timeSeries' ? TIME_SERIES_COLUMN_COUNT : GROUPED_COLUMN_COUNT;

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

  return (
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
          aria-rowcount={labResultsView === 'timeSeries' ? labResultsCount : undefined}
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
            {LAB_VALUE_COLUMNS.map((column) => (
              <HeaderCell key={column.key}>{column.label}</HeaderCell>
            ))}
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
                    <VirtualRow key={virtualRow.key} gridClass={gridClass} start={virtualRow.start}>
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
                  <TimeSeriesLabResultVirtualRow key={row.id} row={row} start={virtualRow.start} />
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
  );
}
