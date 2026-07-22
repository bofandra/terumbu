import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Checkout Success"
};

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
    id?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const failed = params?.status === "failed";
  const pending = params?.status === "pending";
  const typeLabel = params?.type === "expedition" ? "booking" : "donation";
  const title = failed ? "Payment was not completed" : pending ? "Payment proof submitted" : "Your impact is recorded";
  const body = failed
    ? `This ${typeLabel} was not paid, so it remains available for support review.`
    : pending
      ? `Your ${typeLabel} proof has been received and is waiting for manual admin verification.`
      : `This ${typeLabel} has been recorded, and the related dashboard and receipt details are being updated.`;

  return (
    <main className="flex min-h-screen items-center bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">
          Terumbu.eco
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-normal text-ocean-900">{title}</h1>
        <p className="mt-3 text-ocean-900/68">{body}</p>
        <ButtonLink href={failed ? (params?.type === "expedition" ? "/checkout/expedition" : "/checkout/donation") : "/dashboard"} className="mt-7">
          {failed ? "Try Again" : "View Dashboard"}
        </ButtonLink>
      </section>
    </main>
  );
}
