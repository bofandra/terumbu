const metricSkeletons = ["activities", "corals", "field", "certificates", "volunteer", "projects"];

export default function PublicPassportLoading() {
  return (
    <main className="bg-sand-50">
      <section className="bg-ocean-900">
        <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <div className="h-5 w-56 rounded-full bg-white/16" />
            <div className="mt-8 h-14 w-96 max-w-full rounded-full bg-white/16" />
            <div className="mt-5 h-5 w-[42rem] max-w-full rounded-full bg-white/16" />
            <div className="mt-3 h-5 w-[34rem] max-w-full rounded-full bg-white/16" />
          </div>
          <div className="h-80 rounded-2xl bg-white/14" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metricSkeletons.map((item) => (
            <div key={item} className="h-40 rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl animate-pulse gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-6">
          <div className="h-44 rounded-2xl bg-white shadow-soft" />
          <div className="h-96 rounded-2xl bg-white shadow-soft" />
          <div className="h-96 rounded-2xl bg-white shadow-soft" />
        </div>
        <div className="grid gap-6">
          <div className="h-72 rounded-2xl bg-white shadow-soft" />
          <div className="h-72 rounded-2xl bg-white shadow-soft" />
        </div>
      </section>
    </main>
  );
}
