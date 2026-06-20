import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Checkout Success"
};

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">Your impact is recorded</h1>
        <p className="mt-3 text-ocean-900/68">
          The next implementation step is connecting successful payments to donation receipts and dashboard activity.
        </p>
        <ButtonLink href="/dashboard" className="mt-7">
          View Dashboard
        </ButtonLink>
      </section>
    </main>
  );
}

