import Link from "next/link";

import { ExpeditionShareButtons } from "@/components/expedition-share-buttons";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { referralCodeForUser } from "@/lib/referrals";

export const metadata = {
  title: "Checkout Success"
};

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
    id?: string;
    expedition?: string;
    ref?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const [params, sessionUser] = await Promise.all([searchParams, getSessionUser()]);
  const shareReferralCode = sessionUser
    ? referralCodeForUser(sessionUser.id)
    : (params?.ref ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || null;
  const failed = params?.status === "failed";
  const pending = params?.status === "pending";
  const typeLabel = params?.type === "expedition" ? "booking" : "donation";
  const isExpedition = params?.type === "expedition";
  const title = failed
    ? "Payment was not completed"
    : pending
      ? isExpedition
        ? "Your expedition request is recorded"
        : "Payment proof submitted"
      : "Your impact is recorded";
  const body = failed
    ? `This ${typeLabel} was not paid, so it remains available for support review.`
    : pending
      ? isExpedition
        ? "Your seats and payment state are recorded. Confirmation remains pending until the current payment/admin verification flow is completed."
        : `Your ${typeLabel} proof has been received and is waiting for manual admin verification.`
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
        {isExpedition && params?.expedition ? (
          <div className="mt-7 border-t border-ocean-900/10 pt-6 text-left">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">Travel together</p>
            <h2 className="mt-2 text-xl font-bold text-ocean-900">Invite friends to join this expedition</h2>
            <p className="mt-2 text-sm leading-6 text-ocean-900/62">
              Share the expedition while your booking is being confirmed. Your own invite code is used when you are signed in.
            </p>
            <div className="mt-4">
              <ExpeditionShareButtons
                slug={params.expedition}
                title="Terumbu.eco conservation expedition"
                referralCode={shareReferralCode}
              />
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
