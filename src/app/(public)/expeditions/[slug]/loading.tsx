export default function ExpeditionDetailLoading() {
  return (
    <main className="bg-sand-50">
      <section className="bg-white">
        <div className="mx-auto max-w-7xl animate-pulse px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-4 w-80 rounded-full bg-ocean-900/10" />
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
            <div>
              <div className="h-4 w-48 rounded-full bg-ocean-900/10" />
              <div className="mt-5 h-24 max-w-3xl rounded-2xl bg-ocean-900/10" />
              <div className="mt-5 h-20 max-w-2xl rounded-2xl bg-ocean-900/10" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="h-11 rounded-full bg-coral-100/70" />
                <div className="h-11 rounded-full bg-ocean-900/10" />
                <div className="h-11 rounded-full bg-ocean-900/10" />
                <div className="h-11 rounded-full bg-ocean-900/10" />
                <div className="h-11 rounded-full bg-ocean-900/10" />
                <div className="h-11 rounded-full bg-ocean-900/10" />
              </div>
              <div className="mt-7 grid gap-3 lg:grid-cols-[1.55fr_1fr]">
                <div className="h-[320px] rounded-2xl bg-ocean-900/12 sm:h-[380px] lg:h-[360px]" />
                <div className="grid h-[280px] grid-cols-2 grid-rows-2 gap-3 sm:h-[320px] lg:h-[360px]">
                  <div className="rounded-2xl bg-ocean-900/10" />
                  <div className="rounded-2xl bg-ocean-900/10" />
                  <div className="rounded-2xl bg-ocean-900/10" />
                  <div className="rounded-2xl bg-ocean-900/10" />
                </div>
              </div>
              <div className="mt-5 h-20 rounded-xl bg-ocean-900/10" />
            </div>
            <div className="hidden lg:block">
              <div className="h-[520px] rounded-2xl bg-ocean-900/10" />
            </div>
          </div>
        </div>
        <div className="border-t border-ocean-900/10 bg-ocean-50/60">
          <div className="mx-auto grid max-w-7xl animate-pulse gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8 xl:grid-cols-6">
            <div className="h-14 rounded-xl bg-white" />
            <div className="h-14 rounded-xl bg-white" />
            <div className="h-14 rounded-xl bg-white" />
            <div className="h-14 rounded-xl bg-white" />
            <div className="h-14 rounded-xl bg-white" />
            <div className="h-14 rounded-xl bg-white" />
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
