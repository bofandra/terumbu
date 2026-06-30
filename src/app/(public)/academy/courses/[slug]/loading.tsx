export default function CourseDetailLoading() {
  return (
    <div className="bg-sand-50">
      <section className="bg-ocean-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_420px]">
          <div>
            <div className="h-4 w-32 rounded-full bg-white/18" />
            <div className="mt-8 h-14 max-w-2xl rounded-2xl bg-white/16" />
            <div className="mt-3 h-14 max-w-xl rounded-2xl bg-white/12" />
            <div className="mt-6 h-6 max-w-2xl rounded-full bg-white/12" />
          </div>
          <div className="rounded-2xl border border-white/14 bg-white p-5">
            <div className="h-7 w-48 rounded-full bg-ocean-50" />
            <div className="mt-5 h-2 rounded-full bg-ocean-50" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="h-20 rounded-xl bg-ocean-50" />
              <div className="h-20 rounded-xl bg-ocean-50" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-4">
          {["lesson-1", "lesson-2", "assessment"].map((item) => (
            <div key={item} className="h-36 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
          ))}
        </div>
        <div className="grid content-start gap-6">
          <div className="h-80 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
          <div className="h-56 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
        </div>
      </section>
    </div>
  );
}
