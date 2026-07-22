export const metadata = {
  title: "Donation Policy"
};

export default function DonationPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-normal text-ocean-900">Donation Policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-ocean-900/70">
        <p>Donations are recorded against a published campaign, donor details, and payment proof uploaded during checkout.</p>
        <p>Payments are completed outside the website. Uploaded proof remains pending until an admin manually verifies it.</p>
        <p>Paid donations update campaign totals only after admin verification. Receipts are generated from verified transaction data and queued for email delivery.</p>
        <p>Campaign impact claims are supported by partner updates, impact sites, evidence records, and visible verification status.</p>
      </div>
    </main>
  );
}
