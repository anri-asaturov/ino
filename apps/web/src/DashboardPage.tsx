import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@web/components/ui/table';
import { trpc } from '@web/lib/trpc';
import { useMemo } from 'react';
import type { LabResult } from './types/trpc-types';

const LAB_RESULT_COLUMN_COUNT = 12;

export function DashboardPage() {
  const queryClient = useQueryClient();
  const labResultsQuery = useQuery(trpc.labResults.get.queryOptions());
  const isUpdating = labResultsQuery.isFetching;

  const invalidateLabResults = () => {
    return queryClient.invalidateQueries(trpc.labResults.get.queryFilter());
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

  const rows = useMemo(() => {
    return (
      labResultsQuery.data?.flatMap((patient) =>
        patient.labResults.map((labResult) => ({
          patient,
          labResult
        }))
      ) ?? []
    );
  }, [labResultsQuery.data]);

  return (
    <main className="bg-background text-foreground min-h-screen p-4">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          disabled={isUpdating || resetLabResults.isPending || addNewData.isPending}
          onClick={() => resetLabResults.mutate()}
          className="border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 rounded-md border px-3 py-2 text-sm font-medium"
        >
          reset
        </button>
        <button
          type="button"
          disabled={isUpdating || resetLabResults.isPending || addNewData.isPending}
          onClick={() => addNewData.mutate()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 rounded-md px-3 py-2 text-sm font-medium"
        >
          add new data
        </button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Test date</TableHead>
            <TableHead>Patient ID</TableHead>
            <TableHead>Birthdate</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Ethnicity</TableHead>
            <TableHead>Creatine</TableHead>
            <TableHead>Chloride</TableHead>
            <TableHead>Glucose</TableHead>
            <TableHead>Potassium</TableHead>
            <TableHead>Sodium</TableHead>
            <TableHead>Calcium</TableHead>
            <TableHead>Protein</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {labResultsQuery.isPending ? (
            <StateRow>Loading lab results...</StateRow>
          ) : labResultsQuery.isError ? (
            <StateRow>{labResultsQuery.error.message}</StateRow>
          ) : rows.length === 0 ? (
            <StateRow>No lab results found.</StateRow>
          ) : (
            rows.map(({ patient, labResult }) => (
              <TableRow key={labResult.id}>
                <TableCell>{labResult.date}</TableCell>
                <TableCell className="font-mono text-xs">{patient.id}</TableCell>
                <TableCell>{patient.birthdate}</TableCell>
                <TableCell>{patient.gender}</TableCell>
                <TableCell>{patient.ethnicity}</TableCell>
                <LabValueCell value={labResult.creatine} unit={labResult.creatineUnit} />
                <LabValueCell value={labResult.chloride} unit={labResult.chlorideUnit} />
                <LabValueCell
                  value={labResult.fastingGlucose}
                  unit={labResult.fastingGlucoseUnit}
                />
                <LabValueCell value={labResult.potassium} unit={labResult.potassiumUnit} />
                <LabValueCell value={labResult.sodium} unit={labResult.sodiumUnit} />
                <LabValueCell value={labResult.totalCalcium} unit={labResult.totalCalciumUnit} />
                <LabValueCell value={labResult.totalProtein} unit={labResult.totalProteinUnit} />
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

function StateRow({ children }: { children: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={LAB_RESULT_COLUMN_COUNT}
        className="text-muted-foreground h-24 text-center"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function LabValueCell({ value, unit }: { value: LabResult['creatine']; unit: string }) {
  return (
    <TableCell>
      <span className="font-medium">{value.toString()}</span>{' '}
      <span className="text-muted-foreground">{unit}</span>
    </TableCell>
  );
}
