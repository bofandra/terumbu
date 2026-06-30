const trustSkeletons = ["courses", "instructors", "partners", "learners", "tracks", "certificates"];
const courseSkeletons = ["course-1", "course-2", "course-3"];

export default function AcademyLoading() {
  return (
    <div className="bg-sand-50">
      <section className="bg-ocean-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_440px]">
          <div>
            <div className="h-4 w-36 rounded-full bg-white/20" />
            <div className="mt-6 h-14 max-w-2xl rounded-2xl bg-white/16" />
            <div className="mt-3 h-14 max-w-xl rounded-2xl bg-white/12" />
            <div className="mt-6 h-6 max-w-2xl rounded-full bg-white/12" />
            <div className="mt-8 h-16 max-w-2xl rounded-2xl bg-white" />
          </div>
          <div className="rounded-2xl border border-white/14 bg-white/10 p-5">
            <div className="aspect-[16/9] rounded-xl bg-white/14" />
            <div className="mt-5 h-5 w-32 rounded-full bg-white/18" />
            <div className="mt-3 h-8 w-4/5 rounded-full bg-white/18" />
          </div>
        </div>
      </section>

      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-6 lg:px-8">
          {trustSkeletons.map((item) => (
            <div key={item} className="h-16 rounded-xl bg-ocean-50" />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="aspect-[16/9] rounded-xl bg-ocean-50" />
          <div className="mt-5 h-6 w-2/3 rounded-full bg-ocean-50" />
          <div className="mt-4 h-3 rounded-full bg-ocean-50" />
        </div>
        <div className="grid gap-4">
          <div className="h-52 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
          <div className="h-40 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courseSkeletons.map((item) => (
            <div key={item} className="h-80 rounded-2xl border border-ocean-900/10 bg-white shadow-soft" />
          ))}
        </div>
      </section>
    </div>
  );
}
