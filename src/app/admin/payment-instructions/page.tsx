import { Button } from "@/components/ui/button";
import {
  getDonationPaymentInstructions,
  updateDonationPaymentInstructionsAction
} from "@/lib/donation-payment-instructions";

export const metadata = { title: "Payment Instructions" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminPaymentInstructionsPage({ searchParams }: PageProps) {
  const [instructions, params] = await Promise.all([
    getDonationPaymentInstructions(),
    searchParams ?? Promise.resolve({})
  ]);

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donation operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Payment instructions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Configure the manual payment destination shown directly to donors. This keeps donation checkout usable before a payment gateway is selected.
        </p>
      </header>

      {params.saved ? (
        <p className="rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          Payment instructions saved.
        </p>
      ) : null}
      {params.error === "incomplete" ? (
        <p className="rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
          Provider, account name, account/reference number, and method are required before instructions can be enabled.
        </p>
      ) : null}

      <form action={updateDonationPaymentInstructionsAction} className="grid gap-5 rounded-2xl bg-white p-6 shadow-soft">
        <label className="flex items-start gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
          <input name="enabled" type="checkbox" defaultChecked={instructions.enabled} className="mt-1 size-4" />
          <span>
            <span className="block font-bold text-ocean-900">Show these instructions at donation checkout</span>
            <span className="mt-1 block text-sm leading-6 text-ocean-900/58">Disable this while the manual payment destination is unavailable.</span>
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Payment method
            <select name="methodLabel" defaultValue={instructions.methodLabel || "Bank transfer"} className="rounded-xl border border-ocean-900/14 px-4 py-3">
              <option>Bank transfer</option>
              <option>Virtual account</option>
              <option>QR payment</option>
              <option>Other manual payment</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Bank / provider
            <input name="providerName" defaultValue={instructions.providerName} placeholder="e.g. Bank name" className="rounded-xl border border-ocean-900/14 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Recipient / account name
            <input name="accountName" defaultValue={instructions.accountName} className="rounded-xl border border-ocean-900/14 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Account / payment reference number
            <input name="accountNumber" defaultValue={instructions.accountNumber} className="rounded-xl border border-ocean-900/14 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            SWIFT / international code <span className="font-normal text-ocean-900/48">(optional)</span>
            <input name="swiftCode" defaultValue={instructions.swiftCode} className="rounded-xl border border-ocean-900/14 px-4 py-3" />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-ocean-900">
          Donor instructions <span className="font-normal text-ocean-900/48">(optional)</span>
          <textarea name="notes" defaultValue={instructions.notes} placeholder="Short instructions only; do not put secrets here." className="min-h-28 rounded-xl border border-ocean-900/14 px-4 py-3" />
        </label>

        <div>
          <Button type="submit">Save payment instructions</Button>
        </div>
      </form>
    </div>
  );
}
