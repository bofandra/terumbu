import { RefreshCw, ReceiptText } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import {
  reconcileDonationAction,
  reconcileExpeditionBookingAction,
  runMonthlyBillingAction,
  settlePaymentOperationAction
} from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Payments"
};

export const dynamic = "force-dynamic";

type AdminPaymentsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    charged?: string;
    failed?: string;
    skipped?: string;
  }>;
};

const savedMessages: Record<string, string> = {
  "refund-processed": "Refund was approved and processed through the payment workflow.",
  "operation-rejected": "Payment operation was rejected and the requester was notified."
};

const errorMessage = "Could not complete that billing operation. Check whether the payment or refund request is still pending and eligible.";

function billingMessage(params: Awaited<NonNullable<AdminPaymentsPageProps["searchParams"]>> | undefined) {
  if (!params?.saved) {
    return null;
  }

  if (params.saved === "billing-run") {
    return `Monthly billing run complete: ${Number(params.charged ?? 0).toLocaleString("id-ID")} charged, ${Number(params.failed ?? 0).toLocaleString("id-ID")} failed, ${Number(params.skipped ?? 0).toLocaleString("id-ID")} skipped.`;
  }

  return savedMessages[params.saved] ?? "Payment operation saved.";
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const params = await searchParams;
  await requireRole(["admin"], "/admin/payments");
  const data = await getAdminPortalData();

  const donationPriority: Record<string, number> = { created: 0, pending: 1, failed: 2, expired: 3, refunded: 4, paid: 5 };
  const donationQueue = [...data.donations]
    .filter((donation) => donation.status !== "paid" || donation.pendingOperation)
    .sort((a, b) => {
      const firstPriority = a.pendingOperation?.operationType === "refund" ? -1 : donationPriority[a.status] ?? 9;
      const secondPriority = b.pendingOperation?.operationType === "refund" ? -1 : donationPriority[b.status] ?? 9;

      return firstPriority - secondPriority;
    });

  const message = billingMessage(params);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Payments"
        title="Payment reconciliation"
        description="Run due billing, approve refunds, and settle donation or expedition booking payment records."
      />

      {message ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{message}</p> : null}
      {params?.error ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Monthly billing run</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">
              {data.dueSubscriptions.length.toLocaleString("id-ID")} subscriptions are due now.
            </p>
          </div>
          <form action={runMonthlyBillingAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="limit" value="25" />
            <Button type="submit" tone="secondary" className="min-h-10 px-4">
              <RefreshCw className="size-4" aria-hidden="true" />
              Run due billing
            </Button>
          </form>
        </div>
        {data.dueSubscriptions.length > 0 ? (
          <div className="grid gap-2 p-4">
            {data.dueSubscriptions.slice(0, 5).map((subscription) => (
              <p key={subscription.id} className="rounded-lg bg-sand-50 px-3 py-2 text-xs font-bold text-ocean-900/68">
                {subscription.campaignTitle} / {subscription.donorEmail} / {formatCurrency(Number(subscription.amount))}
                {subscription.paymentMethodLast4 ? ` / card ${subscription.paymentMethodLast4}` : " / no payment method"}
              </p>
            ))}
          </div>
        ) : (
          <AdminEmptyState className="m-4" title="No subscriptions due" description="Monthly donation billing will appear here when a run is ready." />
        )}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex items-center justify-between gap-3 border-b border-ocean-900/10 p-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign donation queue</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Pending, failed, refunded, or requested payment changes.</p>
          </div>
          <ReceiptText className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <div className="divide-y divide-ocean-900/10">
          {donationQueue.map((donation) => (
            <div key={donation.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ocean-900">{donation.campaignTitle}</p>
                    <AdminStatusBadge value={donation.status} />
                    {donation.pendingOperation ? <AdminStatusBadge value={donation.pendingOperation.operationType} /> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{donation.donorName ?? "Anonymous donor"}</p>
                  <p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                  {donation.pendingOperation?.reason ? <p className="mt-2 text-xs font-semibold text-ocean-900/52">{donation.pendingOperation.reason}</p> : null}
                </div>
                {donation.pendingOperation?.operationType === "refund" ? (
                  <div className="grid gap-2 sm:min-w-80">
                    <form action={settlePaymentOperationAction} className="grid gap-2">
                      <input type="hidden" name="operationId" value={donation.pendingOperation.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <input name="adminNote" placeholder="Settlement note" className={adminInputClassName} />
                      <Button type="submit" tone="secondary" className="min-h-10 px-4">
                        <ReceiptText className="size-4" aria-hidden="true" />
                        Approve refund
                      </Button>
                    </form>
                    <form action={settlePaymentOperationAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="operationId" value={donation.pendingOperation.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input name="adminNote" placeholder="Reject reason" className={adminInputClassName} />
                      <Button type="submit" tone="ghost" className="min-h-10 px-4 text-coral-700 hover:bg-coral-100">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form action={reconcileDonationAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="donationId" value={donation.id} />
                    {donation.pendingOperation ? <input type="hidden" name="operationId" value={donation.pendingOperation.id} /> : null}
                    <select name="status" defaultValue={donation.status === "failed" ? "failed" : "paid"} className={adminSelectClassName}>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <ReceiptText className="size-4" aria-hidden="true" />
                      Reconcile
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {donationQueue.length === 0 ? (
            <AdminEmptyState className="m-4" title="Donation queue is clear" description="Pending payments, failed payments, and refund requests will appear here when an admin decision is needed." />
          ) : null}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Expedition booking queue</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Pending booking refunds and payment decisions.</p>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.bookingPaymentOperations.map((operation) => (
            <div key={operation.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ocean-900">{operation.expeditionTitle}</p>
                    <AdminStatusBadge value={operation.paymentStatus} />
                    <AdminStatusBadge value={operation.operationType} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{operation.contactName} / {operation.bookingCode}</p>
                  <p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(Number(operation.amount ?? 0))}</p>
                  {operation.reason ? <p className="mt-2 text-xs font-semibold text-ocean-900/52">{operation.reason}</p> : null}
                </div>
                {operation.operationType === "refund" ? (
                  <div className="grid gap-2 sm:min-w-80">
                    <form action={settlePaymentOperationAction} className="grid gap-2">
                      <input type="hidden" name="operationId" value={operation.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <input name="adminNote" placeholder="Settlement note" className={adminInputClassName} />
                      <Button type="submit" tone="secondary" className="min-h-10 px-4">
                        <ReceiptText className="size-4" aria-hidden="true" />
                        Approve refund
                      </Button>
                    </form>
                    <form action={settlePaymentOperationAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="operationId" value={operation.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input name="adminNote" placeholder="Reject reason" className={adminInputClassName} />
                      <Button type="submit" tone="ghost" className="min-h-10 px-4 text-coral-700 hover:bg-coral-100">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form action={reconcileExpeditionBookingAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="bookingId" value={operation.bookingId ?? ""} />
                    <input type="hidden" name="operationId" value={operation.id} />
                    <select name="status" defaultValue="paid" className={adminSelectClassName}>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <ReceiptText className="size-4" aria-hidden="true" />
                      Reconcile
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {data.bookingPaymentOperations.length === 0 ? (
            <AdminEmptyState className="m-4" title="No expedition billing requests" description="Booking refunds and payment decisions will appear here when travelers or admins request changes." />
          ) : null}
        </div>
      </section>
    </div>
  );
}
