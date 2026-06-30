export default function CampaignDetailLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-72 animate-pulse rounded-full bg-ocean-900/10" />
      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="h-[420px] animate-pulse rounded-2xl bg-ocean-900/10" />
            <div className="space-y-5">
              <div className="h-5 w-40 animate-pulse rounded-full bg-coral-500/20" />
              <div className="h-24 animate-pulse rounded-2xl bg-ocean-900/10" />
              <div className="h-28 animate-pulse rounded-2xl bg-ocean-900/10" />
              <div className="h-32 animate-pulse rounded-2xl bg-ocean-900/10" />
            </div>
          </div>
          <div className="h-56 animate-pulse rounded-2xl bg-ocean-900/10" />
        </div>
        <div className="h-[620px] animate-pulse rounded-2xl bg-ocean-900/10" />
      </section>
    </main>
  );
}
