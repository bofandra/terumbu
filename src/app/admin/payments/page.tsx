import { Eye, ReceiptText } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import {
  reconcileDonationAction,
  reconcileExpeditionBookingAction,
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

const errorMessage = "Could not complete that payment operation. Check whether the payment or refund request is still pending and eligible.";

function billingMessage(params: Awaited<NonNullable<AdminPaymentsPageProps["searchParams"]>> | undefined) {
  if (!params?.saved) {
    return null;
  }

  return savedMessages[params.saved] ?? "Payment operation saved.";
}

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: unknown, key: string) {
  const item = metadataObject(value)[key];

  return typeof item === "string" && item.trim() ? item.trim() : null;
}

function proofBackgroundImage(url: string) {
  return {
    backgroundImage: `url("${url.replaceAll("\"", "%22")}")`
  };
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
        description="Verify manual donation payment proofs, approve refunds, and settle expedition booking payment records."
      />

      {message ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{message}</p> : null}
      {params?.error ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className={adminPanelClassName}>
        <div className="flex items-center justify-between gap-3 border-b border-ocean-900/10 p-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Manual payment proof review</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Uploaded transfer proofs wait here until an admin verifies the payment.</p>
          </div>
          <ReceiptText className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <div className="divide-y divide-ocean-900/10">
          {donationQueue.map((donation) => {
            const proofUrl = metadataString(donation.pendingOperation?.metadata, "paymentProofUrl") ?? metadataString(donation.transactionPayload, "paymentProofUrl");
            const paymentReference = metadataString(donation.pendingOperation?.metadata, "paymentReference") ?? metadataString(donation.transactionPayload, "paymentReference");
            const submittedAt = metadataString(donation.pendingOperation?.metadata, "submittedAt") ?? metadataString(donation.transactionPayload, "submittedAt");

            return (
            <div key={donation.id} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ocean-900">{donation.campaignTitle}</p>
                    <AdminStatusBadge value={donation.status} />
                    {donation.pendingOperation ? <AdminStatusBadge value={donation.pendingOperation.operationType} /> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {donation.donorName ?? "Anonymous donor"}{donation.donorEmail ? ` / ${donation.donorEmail}` : ""}
                  </p>
                  <p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                  <div className="mt-3 grid gap-1 text-xs font-semibold text-ocean-900/54">
                    <p>Reference: {paymentReference ?? donation.providerReference ?? "Not provided"}</p>
                    <p>Submitted: {submittedAt ? new Date(submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : donation.createdAt.toLocaleString("id-ID", { dateStyle: "medium" })}</p>
                  </div>
                  {donation.pendingOperation?.reason ? <p className="mt-2 text-xs font-semibold text-ocean-900/52">{donation.pendingOperation.reason}</p> : null}
                </div>
                <div className="grid gap-3">
                  {proofUrl ? (
                    <div className="grid gap-2">
                      <div className="h-28 rounded-lg border border-ocean-900/10 bg-sand-50 bg-cover bg-center" style={proofBackgroundImage(proofUrl)} />
                      <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500">
                        <Eye className="size-4" aria-hidden="true" />
                        View proof
                      </a>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-xs font-bold text-ocean-900/54">No payment proof attached.</p>
                  )}
                  {donation.pendingOperation?.operationType === "refund" ? (
                  <div className="grid gap-2">
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
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 px-4">
                      <ReceiptText className="size-4" aria-hidden="true" />
                      Verify payment
                    </Button>
                  </form>
                )}
                </div>
              </div>
            </div>
            );
          })}
          {donationQueue.length === 0 ? (
            <AdminEmptyState className="m-4" title="Donation queue is clear" description="Uploaded payment proofs and refund requests will appear here when an admin decision is needed." />
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
