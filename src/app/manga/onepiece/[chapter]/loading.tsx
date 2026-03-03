function PageSkeleton({ index }: { index: number }) {
  return (
    <div
      className="mx-auto flex min-h-[90svh] w-[min(980px,96vw)] animate-pulse items-center justify-center rounded-[10px] bg-muted"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="h-6 w-48 rounded bg-muted-foreground/20" />
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
        {Array.from({ length: 3 }, (_, index) => (
          <PageSkeleton key={index} index={index} />
        ))}
      </section>
    </main>
  );
}
