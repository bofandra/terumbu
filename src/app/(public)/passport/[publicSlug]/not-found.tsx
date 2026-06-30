import Link from "next/link";

export default function PublicPassportNotFound() {
  return (
    <main className="bg-sand-50 px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-ocean-900/10 bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact Passport</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">This Impact Passport is private or unavailable.</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ocean-900/62">
          Public visitors cannot see private passports, draft records, receipts, payment details, or hidden activity.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-coral-500 px-5 text-sm font-semibold text-white">
            Sign in
          </Link>
          <Link href="/campaigns" className="inline-flex min-h-11 items-center rounded-full bg-ocean-900 px-5 text-sm font-semibold text-white">
            Explore projects
          </Link>
        </div>
      </section>
    </main>
  );
}
