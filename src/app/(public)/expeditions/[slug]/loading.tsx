export default function ExpeditionDetailLoading() {
  return (
    <main className="bg-sand-50">
      <section className="bg-white">
        <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-4 w-80 rounded-full bg-ocean-900/10" />
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              <div className="min-h-[420px] rounded-2xl bg-ocean-900/12" />
              <div className="grid min-h-[420px] grid-cols-2 gap-3">
                <div className="rounded-2xl bg-ocean-900/10" />
                <div className="rounded-2xl bg-ocean-900/10" />
                <div className="rounded-2xl bg-ocean-900/10" />
                <div className="rounded-2xl bg-ocean-900/10" />
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
              <div>
                <div className="h-4 w-48 rounded-full bg-ocean-900/10" />
                <div className="mt-5 h-20 rounded-2xl bg-ocean-900/10" />
                <div className="mt-5 h-28 rounded-2xl bg-ocean-900/10" />
              </div>
              <div className="h-[520px] rounded-2xl bg-ocean-900/10" />
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl animate-pulse gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="h-80 rounded-2xl bg-white shadow-soft" />
        <div className="h-80 rounded-2xl bg-white shadow-soft" />
      </section>
    </main>
  );
}
