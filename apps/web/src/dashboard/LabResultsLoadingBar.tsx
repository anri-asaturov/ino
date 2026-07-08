import { cn } from '@web/lib/utils';

export function LabResultsLoadingBar({ showLoadingIndicator }: { showLoadingIndicator: boolean }) {
  return (
    <>
      <div
        className={cn(
          'bg-primary/10 pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden transition-opacity duration-200',
          showLoadingIndicator ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden={!showLoadingIndicator}
      >
        <div className="animate-loading-bar bg-primary/80 h-full w-1/3 rounded-r-full shadow-lg motion-reduce:w-full motion-reduce:animate-none" />
      </div>
      {showLoadingIndicator ? <span className="sr-only">Loading lab results</span> : null}
    </>
  );
}
