const kpis = ["committed", "disbursed", "utilized", "units", "employees", "hours"];

export default function CorporateLoading() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <section className="min-h-[240px] rounded-lg bg-ocean-900/18 shadow-soft" />

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((item) => (
          <div key={item} className="h-40 rounded-lg bg-white shadow-soft" />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.05fr_0.8fr]">
        <div className="h-96 rounded-lg bg-white shadow-soft" />
        <div className="h-96 rounded-lg bg-white shadow-soft" />
        <div className="h-96 rounded-lg bg-white shadow-soft" />
      </section>

      <section className="mt-6 h-[420px] rounded-lg bg-white shadow-soft" />

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="h-80 rounded-lg bg-white shadow-soft" />
        <div className="h-80 rounded-lg bg-white shadow-soft" />
        <div className="h-80 rounded-lg bg-white shadow-soft" />
      </section>
    </main>
  );
}
