const skeletonCards = ["hero", "donated", "corals", "expeditions", "academy"];

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-[1440px] animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-8 w-64 rounded-full bg-ocean-900/10" />
      <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-ocean-900/10" />

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="min-h-[280px] rounded-2xl bg-ocean-900/15" />
        <div className="grid gap-4 sm:grid-cols-2">
          {skeletonCards.slice(1).map((item) => (
            <div key={item} className="h-44 rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <div className="h-80 rounded-2xl bg-white shadow-soft" />
        <div className="h-80 rounded-2xl bg-white shadow-soft" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-2xl bg-white shadow-soft" />
        <div className="h-96 rounded-2xl bg-white shadow-soft" />
      </section>
    </main>
  );
}
