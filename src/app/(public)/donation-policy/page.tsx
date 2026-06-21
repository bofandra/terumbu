export const metadata = {
  title: "Donation Policy"
};

export default function DonationPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-normal text-ocean-900">Donation Policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-ocean-900/70">
        <p>Donations are recorded against a published campaign, payment transaction, receipt, and donor details supplied during checkout.</p>
        <p>Paid donations update campaign totals after payment confirmation or admin reconciliation. Receipts are generated from transaction data and queued for email delivery.</p>
        <p>Campaign impact claims are supported by partner updates, impact sites, evidence records, and verification status stored in the platform database.</p>
      </div>
    </main>
  );
}
