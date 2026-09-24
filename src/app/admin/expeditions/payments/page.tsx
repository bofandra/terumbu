import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDomainNav, adminExpeditionNavItems } from "@/components/admin/admin-domain-nav";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { reconcileExpeditionBookingAction, settlePaymentOperationAction } from "@/lib/portal-actions";
import { getAdminPaymentsPage, type AdminPaymentFilters } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Expedition Payments" };
export const dynamic = "force-dynamic";

const pathname = "/admin/expeditions/payments";

type PageProps = {
  searchParams?: Promise<AdminPaymentFilters & { saved?: string; error?: string }>;
};

export default async function AdminExpeditionPaymentsPage({ searchParams }: PageProps) {
  await requireRole(["admin"], pathname);
  const params = (await searchParams) ?? {};
  const data = await getAdminPaymentsPage(params);
  const saved = params.saved ? "Booking payment operation saved." : null;
  const error = params.error ? "Booking payment operation could not be completed. Check the current payment state." : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions / Payments"
        title="Booking reconciliation"
        description="Resolve pending booking payments and refund requests before seats and confirmations are finalized."
      />
      <AdminDomainNav items={adminExpeditionNavItems} active={pathname} />
      {saved ? <AdminAlert tone="success">{saved}</AdminAlert> : null}
      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      <form action={pathname} className="flex flex-wrap gap-2 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
        <input name="bookingQ" defaultValue={data.filters.bookings.q} placeholder="Search booking, guest, expedition" className="min-h-10 min-w-64 flex-1 rounded-lg border border-ocean-900/14 px-3 text-sm font-semibold" />
        <select name="bookingType" defaultValue={data.filters.bookings.operationType} className={adminSelectClassName}>
          <option value="all">All operations</option>
          {data.options.bookingOperationTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
        </select>
        <Button type="submit" tone="secondary">Filter</Button>
      </form>

      <section className="grid gap-3">
        {data.bookingOperations.map((operation) => {
          const isRefund = operation.operationType === "refund";
          return (
            <article key={operation.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-ocean-900">{operation.bookingCode}</h2>
                    <AdminStatusBadge value={operation.paymentStatus} />
                    <AdminStatusBadge value={operation.operationType} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{operation.expeditionTitle} · {operation.contactName} · {operation.contactEmail}</p>
                  <p className="mt-2 text-lg font-bold text-ocean-900">
                    {operation.amount === null ? "Amount pending" : formatCurrency(operation.amount, operation.currency)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/48">{operation.operationCode} · {operation.createdAt.toLocaleString("id-ID")}</p>
                </div>
              </div>

              {isRefund ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ocean-900/10 pt-4">
                  <form action={settlePaymentOperationAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="operationId" value={operation.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <input type="hidden" name="confirmPayment" value="approve" />
                    <Button type="submit">Approve refund</Button>
                  </form>
                  <form action={settlePaymentOperationAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="operationId" value={operation.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button type="submit" tone="secondary">Reject refund</Button>
                  </form>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ocean-900/10 pt-4">
                  <form action={reconcileExpeditionBookingAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="bookingId" value={operation.bookingId} />
                    <input type="hidden" name="operationId" value={operation.id} />
                    <input type="hidden" name="status" value="paid" />
                    <Button type="submit">Confirm paid</Button>
                  </form>
                  <form action={reconcileExpeditionBookingAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="bookingId" value={operation.bookingId} />
                    <input type="hidden" name="operationId" value={operation.id} />
                    <input type="hidden" name="status" value="failed" />
                    <Button type="submit" tone="secondary">Mark failed</Button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
        {data.bookingOperations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/58">
            No expedition payment operations need attention.
          </div>
        ) : null}
      </section>

      <AdminPagination
        pathname={pathname}
        pageParam="bookingPage"
        pagination={data.pagination.bookings}
        params={{
          bookingQ: data.filters.bookings.q || undefined,
          bookingType: data.filters.bookings.operationType === "all" ? undefined : data.filters.bookings.operationType
        }}
      />
    </div>
  );
}
