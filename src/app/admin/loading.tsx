export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
      <div className="border-b border-ocean-900/10 pb-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-ocean-900/10" />
        <div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded-lg bg-ocean-900/10" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-ocean-900/8" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-ocean-900/10 bg-white" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
        <div className="h-14 animate-pulse border-b border-ocean-900/10 bg-sand-50" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse border-b border-ocean-900/10 last:border-b-0" />
        ))}
      </div>
      <span className="sr-only">Loading admin content</span>
    </div>
  );
}
