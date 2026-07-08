import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@web/lib/trpc';
import { useMemo, useState } from 'react';
import { DashboardToolbar } from './dashboard/DashboardToolbar';
import { LabResultsLoadingBar } from './dashboard/LabResultsLoadingBar';
import { LabResultsTable } from './dashboard/LabResultsTable';
import {
  GROUPED_LAB_RESULTS_PAGE_LIMIT,
  TIME_SERIES_PAGE_LIMIT,
  type LabResultsView,
  type NewDataPatients
} from './dashboard/labResultsConfig';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [labResultsView, setLabResultsView] = useState<LabResultsView>('timeSeries');
  const [newDataPatients, setNewDataPatients] = useState<NewDataPatients>(10);
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
  const activeQuery = labResultsView === 'timeSeries' ? timeSeriesQuery : byPatientQuery;

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
  const showLoadingIndicator = activeQuery.isFetching || isMutatingLabResults;

  const handleResetLabResults = () => {
    const confirmed = window.confirm(
      'Reset the dataset to its initial state? All added data will be removed.'
    );

    if (confirmed) resetLabResults.mutate();
  };

  const timeSeriesRows = useMemo(() => {
    return timeSeriesQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  }, [timeSeriesQuery.data]);

  const groupedRows = useMemo(() => {
    return byPatientQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  }, [byPatientQuery.data]);

  const rows = labResultsView === 'timeSeries' ? timeSeriesRows : groupedRows;

  return (
    <main className="bg-background text-foreground min-h-screen p-4">
      <LabResultsLoadingBar showLoadingIndicator={showLoadingIndicator} />
      <DashboardToolbar
        labResultsView={labResultsView}
        newDataPatients={newDataPatients}
        isMutatingLabResults={isMutatingLabResults}
        patientsCount={statsQuery.data?.patients}
        labResultsCount={statsQuery.data?.labResults}
        onLabResultsViewChange={setLabResultsView}
        onNewDataPatientsChange={setNewDataPatients}
        onAddNewData={() => addNewData.mutate({ patients: newDataPatients })}
        onResetLabResults={handleResetLabResults}
      />
      <LabResultsTable
        labResultsView={labResultsView}
        activeQuery={activeQuery}
        rows={rows}
        labResultsCount={statsQuery.data?.labResults}
      />
    </main>
  );
}
