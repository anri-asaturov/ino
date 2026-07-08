import { cn } from '@web/lib/utils';
import type { ComponentProps } from 'react';

export function VirtualRow({
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

export function HeaderCell({ children }: { children: string }) {
  return (
    <div
      className="text-foreground h-10 px-3 py-2 text-left align-middle whitespace-nowrap"
      role="columnheader"
    >
      {children}
    </div>
  );
}

export function GridCell({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-3 py-3 whitespace-nowrap', className)} role="cell" {...props} />;
}

export function StateBlock({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
      {children}
    </div>
  );
}
