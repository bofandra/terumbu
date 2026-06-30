const metricSkeletons = ["contributed", "corals", "expeditions", "courses", "volunteer", "projects"];

export default function DashboardPassportLoading() {
  return (
    <main className="mx-auto max-w-[1500px] animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-5 w-72 rounded-full bg-ocean-900/10" />
      <div className="mt-5 h-9 w-96 max-w-full rounded-full bg-ocean-900/10" />
      <div className="mt-3 h-4 w-[42rem] max-w-full rounded-full bg-ocean-900/10" />

      <section className="mt-6 min-h-[320px] rounded-2xl bg-ocean-900/20 shadow-soft" />

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricSkeletons.map((item) => (
          <div key={item} className="h-40 rounded-2xl bg-white shadow-soft" />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr_330px]">
        <div className="grid gap-6">
          <div className="h-96 rounded-2xl bg-white shadow-soft" />
          <div className="h-64 rounded-2xl bg-white shadow-soft" />
        </div>
        <div className="grid gap-6">
          <div className="h-44 rounded-2xl bg-white shadow-soft" />
          <div className="h-96 rounded-2xl bg-white shadow-soft" />
          <div className="h-96 rounded-2xl bg-white shadow-soft" />
        </div>
        <div className="grid gap-6">
          <div className="h-96 rounded-2xl bg-white shadow-soft" />
          <div className="h-64 rounded-2xl bg-white shadow-soft" />
        </div>
      </section>
    </main>
  );
}
