import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requestCheckoutStatusEmailAction } from "@/lib/checkout-recovery-actions";

export const metadata = { title: "Recover payment status" };
export const dynamic = "force-dynamic";

export default async function CheckoutRecoveryPage({
  searchParams
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">Terumbu.eco</Link>
        <h1 className="mt-8 text-3xl font-bold text-ocean-900">Find your guest payments</h1>
        <p className="mt-3 text-sm leading-6 text-ocean-900/70">
          Changed devices? Enter the email used at checkout. If we have guest Midtrans
          payments for this address, we will email a short-lived access link.
        </p>
        {params?.sent ? (
          <p role="status" className="mt-5 rounded-xl bg-kelp-100 p-4 text-sm font-semibold text-kelp-700">
            If any eligible guest payments match, secure links will be sent to that email.
            Check your inbox and spam folder.
          </p>
        ) : null}
        {params?.error === "expired" ? (
          <p role="alert" className="mt-5 rounded-xl bg-sand-50 p-4 text-sm font-semibold text-ocean-900">
            This link was already used or has expired. Request a new one below.
          </p>
        ) : null}
        <form action={requestCheckoutStatusEmailAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Checkout email
            <input name="email" type="email" autoComplete="email" maxLength={255}
              className="rounded-xl border border-ocean-900/15 px-4 py-3"
              required />
          </label>
          <Button type="submit">Email me a secure access link</Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-ocean-900/55">
          Links expire after 15 minutes and work once. They only show guest Midtrans
          checkout statuses. Registered accounts should sign in to view their transactions.
        </p>
      </section>
    </main>
  );
}
