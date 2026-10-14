/* Shown while a portal page streams in. Shapes mirror the dashboard. */
export default function Loading() {
  const block = "rounded-panel border border-line bg-panel";
  return (
    <div className="mx-auto flex max-w-[1400px] animate-pulse flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-56 rounded-panel bg-brand-ink/90" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            <div className={`h-32 ${block}`} />
            <div className={`h-32 ${block}`} />
            <div className={`hidden h-32 2xl:block ${block}`} />
          </div>
          <div className={`h-80 ${block}`} />
        </div>
        <div className="flex flex-col gap-6">
          <div className={`h-72 ${block}`} />
          <div className={`h-64 ${block}`} />
        </div>
      </div>
    </div>
  );
}
