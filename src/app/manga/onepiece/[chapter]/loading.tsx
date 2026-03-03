import type { ReactNode } from "react";

function Panel({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-[4px] animate-pulse-scale ${className ?? "bg-muted/60 dark:bg-muted/40"}`}
    />
  );
}

function MangaPageSkeleton() {
  return (
    <div className="mx-auto w-[min(980px,96vw)] p-2 sm:p-3 bg-muted/20 dark:bg-muted/10 rounded-[12px]">
      <div className="space-y-2 sm:space-y-3">
        <div className="grid h-[220px] grid-cols-[1fr_2.9fr] gap-2 sm:h-[300px] sm:gap-3">
          <Panel />
          <Panel />
        </div>

        <div className="grid h-[220px] grid-cols-[1fr_1fr_1.45fr] gap-2 sm:h-[300px] sm:gap-3">
          <Panel />
          <Panel />
          <Panel />
        </div>

        <div className="grid h-[220px] grid-cols-[0.45fr_1fr_1fr_1fr] gap-2 sm:h-[300px] sm:gap-3">
          <Panel />
          <Panel />
          <Panel />
          <Panel />
        </div>
      </div>
    </div>
  );
}

export default function OnePieceChapterLoading() {
  return (
    <main className="w-full" aria-busy="true" aria-live="polite">
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-border bg-card px-3 shadow-md sm:px-6">
        <div className="flex items-center gap-3">
          <span className="h-5 w-24 animate-pulse rounded bg-muted" />
          <span className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-[0.85rem] font-semibold text-foreground">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading chapter...
        </span>
      </header>

      <section className="grid gap-3 bg-background px-2 pb-3 pt-[68px] sm:px-3">
        {Array.from({ length: 2 }, (_, index) => (
          <MangaPageSkeleton key={index} />
        ))}
      </section>
    </main>
  );
}
