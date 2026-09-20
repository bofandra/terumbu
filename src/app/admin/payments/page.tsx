import { AlertTriangle, Eye, ReceiptText, RotateCcw, SearchCheck } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { requireRole } from "@/lib/auth";
import {
  reconcileDonationAction,
  reconcileExpeditionBookingAction,
  settlePaymentOperationAction
} from "@/lib/portal-actions";
import { getAdminPaymentsPage, type AdminPaymentFilters } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Admin Payments" };
export const dynamic = "force-dynamic";

const pathname = "/admin/payments";

type PaymentSearchParams = AdminPaymentFilters & { saved?: string; error?: string; workspace?: string };

type AdminPaymentsPageProps = {
  searchParams?: Promise<PaymentSearchParams>;
};

const savedMessages: Record<string, string> = {
  "refund-processed": "Refund was approved and processed through the payment workflow.",
  "operation-rejected": "Payment operation was rejected and the requester was notified.",
  donation: "Donation payment reconciliation saved.",
  booking: "Expedition booking payment reconciliation saved."
};

const errorMessages: Record<string, string> = {
  operation: "Could not complete that payment operation. It may no longer be pending or eligible.",
  donation: "Could not reconcile that donation payment.",
  booking: "Could not reconcile that expedition booking payment.",
  "payment-confirmation": "Confirm the refund before sending the settlement request to the payment provider."
};

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: unknown, key: string) {
  const item = metadataObject(value)[key];
  return typeof item === "string" && item.trim() ? item.trim() : null;
}

function proofBackgroundImage(url: string) {
  return { backgroundImage: `url("${url.replaceAll("\"", "%22")}")` };
}

function paymentReturnPath(params: PaymentSearchParams, workspace: "donations" | "bookings") {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "saved" || key === "error" || value === undefined) continue;
    const item = Array.isArray(value) ? value[0] : value;
    if (item) search.set(key, item);
  }
  search.set("workspace", workspace);
  return `${pathname}?${search.toString()}`;
}

function RefundDecision({ operationId, label, amount, currency, next }: { operationId: string; label: string; amount: number; currency: string; next: string }) {
  const approveFormId = `approve-refund-${operationId}`;
  return (
    <div className="grid gap-2 rounded-lg border border-coral-500/20 bg-coral-50/40 p-3">
      <div className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral-700" aria-hidden="true" /><p>Refund approval is a financial action. Verify the amount and target before continuing.</p></div>
      <form id={approveFormId} action={settlePaymentOperationAction} className="grid gap-2">
        <input type="hidden" name="operationId" value={operationId} /><input type="hidden" name="decision" value="approve" /><input type="hidden" name="next" value={next} />
        <input name="adminNote" placeholder="Approval note (optional)" className={adminInputClassName} />
      </form>
      <AdminConfirmSubmit
        formId={approveFormId}
        title={`Approve refund for ${label}?`}
        body={`Process a refund of ${formatCurrency(amount, currency)}. The payment provider settlement will be triggered and this action will be audit logged.`}
        triggerLabel="Approve refund"
        submitLabel="Confirm refund"
        confirmationName="confirmPayment"
        confirmationValue="approve"
        destructive={false}
      />
      <form action={settlePaymentOperationAction} className="grid gap-2 border-t border-ocean-900/10 pt-2">
        <input type="hidden" name="operationId" value={operationId} /><input type="hidden" name="decision" value="reject" /><input type="hidden" name="next" value={next} />
        <input name="adminNote" placeholder="Rejection reason" className={adminInputClassName} required />
        <Button type="submit" tone="secondary" className="min-h-10 px-3">Reject refund request</Button>
      </form>
    </div>
  );
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  await requireRole(["admin"], pathname);
  const params = (await searchParams) ?? {};
  const data = await getAdminPaymentsPage(params);
  const workspace = params.workspace === "bookings" ? "bookings" : "donations";
  const donationNext = paymentReturnPath(params, "donations");
  const bookingNext = paymentReturnPath(params, "bookings");

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Payments" title="Payment reconciliation" description="Review donation payments and expedition billing requests with server-side search, filtering, and pagination." />
      {params.saved ? <AdminAlert tone="success">{savedMessages[params.saved] ?? "Payment operation saved."}</AdminAlert> : null}
      {params.error ? <AdminAlert tone="error">{errorMessages[params.error] ?? "Could not complete that payment operation."}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Payment operations summary">
        {[
          { label: "Donation queue", value: data.summary.donations, icon: ReceiptText },
          { label: "Donation refunds", value: data.summary.donationRefunds, icon: RotateCcw },
          { label: "Donation failures", value: data.summary.donationFailures, icon: AlertTriangle },
          { label: "Booking requests", value: data.summary.bookings, icon: SearchCheck },
          { label: "Booking refunds", value: data.summary.bookingRefunds, icon: RotateCcw }
        ].map((item) => { const Icon = item.icon; return <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft"><Icon className="size-5 text-coral-700" aria-hidden="true" /><MetricValue className="mt-3 text-ocean-900">{item.value.toLocaleString("id-ID")}</MetricValue><p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p></article>; })}
      </section>

      <FormTabs ariaLabel="Payment reconciliation workflows" defaultTabId={workspace} tabs={[
        { id: "donations", label: "Donations", description: "Manual proofs and refunds", badge: data.pagination.donations.totalItems.toLocaleString("id-ID") },
        { id: "bookings", label: "Expedition Bookings", description: "Booking billing", badge: data.pagination.bookings.totalItems.toLocaleString("id-ID") }
      ]}>
        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="donationQ" pageName="donationPage" searchValue={data.filters.donations.q} searchPlaceholder="Search campaign, donor, email, or operation" clearHref={`${pathname}?workspace=donations`} hiddenFields={{ workspace: "donations", donationSort: data.filters.donations.sort === "priority" ? undefined : data.filters.donations.sort, donationDir: data.filters.donations.dir === "asc" ? undefined : data.filters.donations.dir }}>
            <select name="donationStatus" defaultValue={data.filters.donations.status} className={`${adminSelectClassName} min-h-10`}><option value="all">All queue statuses</option><option value="refund">Refund requests</option><option value="created">Created</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="expired">Expired</option><option value="refunded">Refunded</option><option value="paid">Paid with pending operation</option></select>
          </AdminListToolbar>

          <section className={adminPanelClassName}>
            <div className="flex items-center justify-between gap-3 border-b border-ocean-900/10 p-4"><div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation payment queue</h2><p className="mt-1 text-sm font-semibold text-ocean-900/58">Only records requiring reconciliation or containing a pending operation are shown.</p></div><ReceiptText className="size-5 text-coral-700" aria-hidden="true" /></div>
            <div className="divide-y divide-ocean-900/10">
              {data.donations.length ? data.donations.map((donation) => {
                const operation = donation.pendingOperation;
                const proofUrl = metadataString(operation?.metadata, "paymentProofUrl") ?? metadataString(donation.latestTransaction?.payload, "paymentProofUrl");
                const paymentReference = metadataString(operation?.metadata, "paymentReference") ?? metadataString(donation.latestTransaction?.payload, "paymentReference") ?? donation.latestTransaction?.providerReference ?? operation?.providerReference;
                const submittedAt = metadataString(operation?.metadata, "submittedAt") ?? metadataString(donation.latestTransaction?.payload, "submittedAt");
                return <article key={donation.id} className="p-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-ocean-900">{donation.campaignTitle}</p><AdminStatusBadge value={donation.status} />{operation ? <AdminStatusBadge value={operation.operationType} /> : null}</div><p className="mt-1 text-sm font-semibold text-ocean-900/58">{donation.donorName ?? "Anonymous donor"}{donation.donorEmail ? ` / ${donation.donorEmail}` : ""}</p><p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(donation.amount, donation.currency)}</p><div className="mt-3 grid gap-1 text-xs font-semibold text-ocean-900/54"><p>Reference: {paymentReference ?? "Not provided"}</p><p>Submitted: {submittedAt ? new Date(submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : donation.createdAt.toLocaleString("id-ID", { dateStyle: "medium" })}</p></div>{operation?.reason ? <p className="mt-2 text-xs font-semibold text-ocean-900/52">{operation.reason}</p> : null}</div><div className="grid gap-3">{proofUrl ? <div className="grid gap-2"><div className="h-28 rounded-lg border border-ocean-900/10 bg-sand-50 bg-cover bg-center" style={proofBackgroundImage(proofUrl)} /><a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500"><Eye className="size-4" aria-hidden="true" />View proof</a></div> : <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-xs font-bold text-ocean-900/54">No payment proof attached.</p>}{operation?.operationType === "refund" ? <RefundDecision operationId={operation.id} label={donation.campaignTitle} amount={Number(operation.amount ?? donation.amount)} currency={operation.currency ?? donation.currency} next={donationNext} /> : <form action={reconcileDonationAction} className="grid gap-2"><input type="hidden" name="donationId" value={donation.id} />{operation ? <input type="hidden" name="operationId" value={operation.id} /> : null}<input type="hidden" name="next" value={donationNext} /><select name="status" defaultValue={donation.status === "failed" ? "failed" : "paid"} className={adminSelectClassName}><option value="paid">Mark paid / verified</option><option value="failed">Reject proof / failed</option></select><Button type="submit" tone="secondary" className="min-h-10 px-4"><ReceiptText className="size-4" aria-hidden="true" />Reconcile</Button></form>}</div></div></article>;
              }) : <AdminEmptyState className="m-4" title="No donation payments match" description="Adjust the search or status filter." />}
            </div>
          </section>
          <AdminPagination pathname={pathname} pageParam="donationPage" params={{ workspace: "donations", donationQ: data.filters.donations.q || undefined, donationStatus: data.filters.donations.status === "all" ? undefined : data.filters.donations.status, donationSort: data.filters.donations.sort === "priority" ? undefined : data.filters.donations.sort, donationDir: data.filters.donations.dir === "asc" ? undefined : data.filters.donations.dir }} pagination={data.pagination.donations} />
        </section>

        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="bookingQ" pageName="bookingPage" searchValue={data.filters.bookings.q} searchPlaceholder="Search booking, traveler, expedition, or operation" clearHref={`${pathname}?workspace=bookings`} hiddenFields={{ workspace: "bookings", bookingSort: data.filters.bookings.sort === "createdAt" ? undefined : data.filters.bookings.sort, bookingDir: data.filters.bookings.dir === "desc" ? undefined : data.filters.bookings.dir }}>
            <select name="bookingType" defaultValue={data.filters.bookings.operationType} className={`${adminSelectClassName} min-h-10`}><option value="all">All operation types</option>{data.options.bookingOperationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          </AdminListToolbar>
          <section className={adminPanelClassName}>
            <div className="border-b border-ocean-900/10 p-4"><h2 className="text-xl font-bold tracking-normal text-ocean-900">Expedition booking billing</h2><p className="mt-1 text-sm font-semibold text-ocean-900/58">Pending booking payment operations are loaded page-by-page.</p></div>
            <div className="divide-y divide-ocean-900/10">{data.bookingOperations.length ? data.bookingOperations.map((operation) => <article key={operation.id} className="p-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start"><div><div className="flex flex-wrap gap-2"><p className="font-bold text-ocean-900">{operation.expeditionTitle}</p><AdminStatusBadge value={operation.paymentStatus} /><AdminStatusBadge value={operation.operationType} /></div><p className="mt-1 text-sm font-semibold text-ocean-900/58">{operation.contactName} / {operation.contactEmail} / {operation.bookingCode}</p><p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(Number(operation.amount ?? 0), operation.currency)}</p>{operation.reason ? <p className="mt-2 text-xs font-semibold text-ocean-900/52">{operation.reason}</p> : null}</div>{operation.operationType === "refund" ? <RefundDecision operationId={operation.id} label={operation.bookingCode} amount={Number(operation.amount ?? 0)} currency={operation.currency} next={bookingNext} /> : <form action={reconcileExpeditionBookingAction} className="grid gap-2"><input type="hidden" name="bookingId" value={operation.bookingId ?? ""} /><input type="hidden" name="operationId" value={operation.id} /><input type="hidden" name="next" value={bookingNext} /><select name="status" defaultValue="paid" className={adminSelectClassName}><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select><Button type="submit" tone="secondary" className="min-h-10 px-4"><ReceiptText className="size-4" aria-hidden="true" />Reconcile</Button></form>}</div></article>) : <AdminEmptyState className="m-4" title="No expedition billing requests match" description="Adjust the search or operation filter." />}</div>
          </section>
          <AdminPagination pathname={pathname} pageParam="bookingPage" params={{ workspace: "bookings", bookingQ: data.filters.bookings.q || undefined, bookingType: data.filters.bookings.operationType === "all" ? undefined : data.filters.bookings.operationType, bookingSort: data.filters.bookings.sort === "createdAt" ? undefined : data.filters.bookings.sort, bookingDir: data.filters.bookings.dir === "desc" ? undefined : data.filters.bookings.dir }} pagination={data.pagination.bookings} />
        </section>
      </FormTabs>
    </div>
  );
}
