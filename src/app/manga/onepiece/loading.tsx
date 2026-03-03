function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export default function OnePieceLoading() {
  return (
    <main
      className="mx-auto mb-[54px] mt-9 grid w-[96vw] max-w-[1800px] gap-[18px] px-2 max-[700px]:mb-10 max-[700px]:mt-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-[18px] bg-card p-4 shadow-md md:p-6">
          <SkeletonBlock className="mb-4 h-6 w-40" />
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SkeletonBlock className="h-9 w-[140px]" />
            <SkeletonBlock className="h-9 w-full sm:w-[260px]" />
          </div>
          <div className="grid max-h-[65svh] grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 overflow-y-auto pr-1">
            {Array.from({ length: 30 }, (_, index) => (
              <SkeletonBlock key={index} className="h-11" />
            ))}
          </div>
        </section>

        <section className="rounded-[18px] border border-border bg-card p-4 shadow-md md:p-6">
          <SkeletonBlock className="mb-6 h-64 w-full rounded-[14px] md:h-80" />
          <div className="flex flex-col gap-6 md:flex-row">
            <SkeletonBlock className="h-[300px] w-full md:max-w-[220px]" />
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap gap-2.5">
                <SkeletonBlock className="h-7 w-16 rounded-full" />
                <SkeletonBlock className="h-7 w-14 rounded-full" />
                <SkeletonBlock className="h-7 w-20 rounded-full" />
                <SkeletonBlock className="h-7 w-16 rounded-full" />
              </div>
              <SkeletonBlock className="h-11 w-60" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-[90%]" />
              <SkeletonBlock className="mt-2 h-11 w-36 rounded-[10px]" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
