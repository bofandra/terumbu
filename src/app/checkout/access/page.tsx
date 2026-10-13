import Link from "next/link";

import { Button } from "@/components/ui/button";
import { redeemCheckoutStatusEmailAction } from "@/lib/checkout-recovery-actions";

export const metadata = {
  title: "Confirm payment status access",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

/**
 * IMPORTANT: GET never consumes the token. Mail-security link scanners may
 * visit this page automatically; only an explicit POST redeems the grant.
 */
export default async function CheckoutAccessPage({
  searchParams
}: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = /^[0-9a-f]{64}$/.test(params?.token ?? "") ? params!.token : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <meta name="referrer" content="no-referrer" />
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft">
        <Link href="/" className="text-xl font-bold text-ocean-900">Terumbu.eco</Link>
        <h1 className="mt-8 text-2xl font-bold text-ocean-900">Confirm access to payment status</h1>
        <p className="mt-3 text-sm leading-6 text-ocean-900/70">
          You followed a secure link from a Terumbu email. Confirm to authorize this
          browser to view only that checkout&apos;s payment status for 30 days.
        </p>
        {token ? (
          <form action={redeemCheckoutStatusEmailAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <Button type="submit">Confirm and open payment status</Button>
          </form>
        ) : (
          <p className="mt-5 text-sm font-semibold text-coral-700">
            This access link is invalid. Request a new link.
          </p>
        )}
        <Link href="/checkout/recover" className="mt-5 inline-block text-sm font-bold text-coral-700">
          Request another secure link
        </Link>
      </section>
    </main>
  );
}
