import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDomainNav, adminExpeditionNavItems } from "@/components/admin/admin-domain-nav";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { reconcileExpeditionBookingAction, settlePaymentOperationAction } from "@/lib/portal-actions";
import { getAdminExpeditionPaymentsPage, type AdminExpeditionPaymentFilters } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Expedition Payments" };
export const dynamic = "force-dynamic";

const pathname = "/admin/expeditions/payments";

type PageProps = {
  searchParams?: Promise<AdminExpeditionPaymentFilters & { saved?: string; error?: string }>;
};

export default async function AdminExpeditionPaymentsPage({ searchParams }: PageProps) {
  await requireRole(["admin"], pathname);
  const params = (await searchParams) ?? {};
  const data = await getAdminExpeditionPaymentsPage(params);
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
        <input name="q" defaultValue={data.filters.q} placeholder="Search booking, guest, expedition" className="min-h-10 min-w-64 flex-1 rounded-lg border border-ocean-900/14 px-3 text-sm font-semibold" />
        <select name="queue" defaultValue={data.filters.queue} className={adminSelectClassName}>
          <option value="all">All actionable</option>
          <option value="payment">Booking payments</option>
          <option value="refund">Refund requests</option>
        </select>
        <Button type="submit" tone="secondary">Filter</Button>
      </form>

      <section className="grid gap-3">
        {data.bookings.map((booking) => {
          const operation = booking.pendingOperation;
          const isRefund = operation?.operationType === "refund";
          return (
            <article key={booking.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-ocean-900">{booking.bookingCode}</h2>
                    <AdminStatusBadge value={booking.paymentStatus} />
                    <AdminStatusBadge value={booking.bookingStatus} />
                    {operation ? <AdminStatusBadge value={operation.operationType} /> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{booking.expeditionTitle} · {booking.contactName} · {booking.contactEmail}</p>
                  <p className="mt-2 text-lg font-bold text-ocean-900">{formatCurrency(booking.totalAmount, booking.currency)}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/48">
                    {booking.participantsCount} participant(s) · {booking.bookedAt.toLocaleString("id-ID")}
                    {booking.providerReference ? ` · Ref ${booking.providerReference}` : ""}
                  </p>
                </div>
              </div>

              {isRefund && operation ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ocean-900/10 pt-4">
                  <form action={settlePaymentOperationAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="operationId" value={operation?.id ?? ""} />
                    <input type="hidden" name="decision" value="approve" />
                    <input type="hidden" name="confirmPayment" value="approve" />
                    <Button type="submit">Approve refund</Button>
                  </form>
                  <form action={settlePaymentOperationAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="operationId" value={operation?.id ?? ""} />
                    <input type="hidden" name="decision" value="reject" />
                    <Button type="submit" tone="secondary">Reject refund</Button>
                  </form>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ocean-900/10 pt-4">
                  <form action={reconcileExpeditionBookingAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="operationId" value={operation?.id ?? ""} />
                    <input type="hidden" name="status" value="paid" />
                    <Button type="submit">Confirm paid</Button>
                  </form>
                  <form action={reconcileExpeditionBookingAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="operationId" value={operation?.id ?? ""} />
                    <input type="hidden" name="status" value="failed" />
                    <Button type="submit" tone="secondary">Mark failed</Button>
                  </form>
                </div>
              )}
            </article>
          );
        })}
        {data.bookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/58">
            No expedition payment operations need attention.
          </div>
        ) : null}
      </section>

      <AdminPagination
        pathname={pathname}
        pagination={data.pagination}
        params={{
          q: data.filters.q || undefined,
          queue: data.filters.queue === "all" ? undefined : data.filters.queue,
          sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
          dir: data.filters.dir === "asc" ? undefined : data.filters.dir
        }}
      />
    </div>
  );
}
