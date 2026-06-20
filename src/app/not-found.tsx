import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
      <section className="max-w-md rounded-2xl bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Page not found</h1>
        <p className="mt-3 text-ocean-900/68">The page may have moved as the Terumbu platform is being built.</p>
        <ButtonLink href="/" className="mt-6">
          Back Home
        </ButtonLink>
      </section>
    </main>
  );
}

