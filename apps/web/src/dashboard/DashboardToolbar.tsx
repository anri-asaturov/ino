import { cn } from '@web/lib/utils';
import {
  LAB_RESULTS_VIEW_OPTIONS,
  NEW_DATA_PATIENT_OPTIONS,
  type LabResultsView,
  type NewDataPatients
} from './labResultsConfig';

type DashboardToolbarProps = {
  labResultsView: LabResultsView;
  newDataPatients: NewDataPatients;
  isMutatingLabResults: boolean;
  patientsCount?: number;
  labResultsCount?: number;
  onLabResultsViewChange: (view: LabResultsView) => void;
  onNewDataPatientsChange: (patients: NewDataPatients) => void;
  onAddNewData: () => void;
  onResetLabResults: () => void;
};

export function DashboardToolbar({
  labResultsView,
  newDataPatients,
  isMutatingLabResults,
  patientsCount,
  labResultsCount,
  onLabResultsViewChange,
  onNewDataPatientsChange,
  onAddNewData,
  onResetLabResults
}: DashboardToolbarProps) {
  return (
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
            onClick={() => onLabResultsViewChange(option.value)}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
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
        onChange={(event) => onNewDataPatientsChange(Number(event.target.value) as NewDataPatients)}
        className="border-input bg-background rounded-md border px-3 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
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
        onClick={onAddNewData}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
      >
        Add new data
      </button>
      <div className="text-muted-foreground ml-auto flex gap-3 text-sm">
        <span>{patientsCount ?? '-'} patients</span>
        <span>{labResultsCount ?? '-'} results</span>
      </div>
      <button
        type="button"
        disabled={isMutatingLabResults}
        onClick={onResetLabResults}
        className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-md border bg-transparent px-3 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  );
}
