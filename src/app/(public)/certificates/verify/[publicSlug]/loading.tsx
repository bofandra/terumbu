export default function CertificateVerificationLoading() {
  return (
    <main className="bg-sand-50">
      <section className="bg-ocean-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="h-4 w-48 rounded-full bg-white/16" />
            <div className="mt-8 h-12 max-w-2xl rounded-2xl bg-white/16" />
            <div className="mt-4 h-7 max-w-xl rounded-full bg-white/12" />
            <div className="mt-8 flex gap-2">
              <div className="h-11 w-44 rounded-full bg-white/18" />
              <div className="h-11 w-36 rounded-full bg-white/14" />
            </div>
          </div>
          <div className="h-80 rounded-2xl border border-white/16 bg-white/10" />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-3 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-36 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
        ))}
      </section>
    </main>
  );
}
