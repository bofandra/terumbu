export const metadata = {
  title: "Refund Policy"
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-normal text-ocean-900">Refund Policy</h1>
      <div className="mt-6 space-y-5 text-sm leading-7 text-ocean-900/70">
        <p>Refund eligibility depends on payment status, campaign disbursement state, expedition booking terms, and partner reconciliation.</p>
        <p>Refunded or failed payment statuses remain visible in operational records so finance and support teams can reconcile donor and booking history.</p>
        <p>For expedition bookings, refunds may depend on departure timing, participant capacity, and local partner commitments already made for the trip.</p>
      </div>
    </main>
  );
}
