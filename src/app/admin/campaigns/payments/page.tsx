import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDomainNav, adminDonationNavItems } from "@/components/admin/admin-domain-nav";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminPageHeader, AdminStatusBadge, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { reconcileDonationAction, settlePaymentOperationAction } from "@/lib/portal-actions";
import { getAdminPaymentsPage, type AdminPaymentFilters } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Donation Payments" };
export const dynamic = "force-dynamic";

const pathname = "/admin/campaigns/payments";

type PageProps = {
  searchParams?: Promise<AdminPaymentFilters & { saved?: string; error?: string }>;
};

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function AdminDonationPaymentsPage({ searchParams }: PageProps) {
  await requireRole(["admin"], pathname);
  const params = (await searchParams) ?? {};
  const data = await getAdminPaymentsPage(params);
  const saved = params.saved ? "Payment operation saved." : null;
  const error = params.error ? "Payment operation could not be completed. Check the current payment state." : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Donations / Payments"
        title="Payment verification"
        description="Verify external donation payment proofs and process pending refund operations."
      />
      <AdminDomainNav items={adminDonationNavItems} active={pathname} />
      {saved ? <AdminAlert tone="success">{saved}</AdminAlert> : null}
      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      <form action={pathname} className="flex flex-wrap gap-2 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
        <input name="donationQ" defaultValue={data.filters.donations.q} placeholder="Search donor, campaign, email" className="min-h-10 min-w-64 flex-1 rounded-lg border border-ocean-900/14 px-3 text-sm font-semibold" />
        <select name="donationStatus" defaultValue={data.filters.donations.status} className={adminSelectClassName}>
          <option value="all">All pending work</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refund">Refund requests</option>
        </select>
        <Button type="submit" tone="secondary">Filter</Button>
      </form>

      <section className="grid gap-3">
        {data.donations.map((donation) => {
          const transactionPayload = objectValue(donation.latestTransaction?.payload);
          const proofUrl = typeof transactionPayload.paymentProofUrl === "string" ? transactionPayload.paymentProofUrl : null;
          const operation = donation.pendingOperation;
          const isRefund = operation?.operationType === "refund";

          return (
            <article key={donation.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-ocean-900">{donation.donorName || donation.donorEmail}</h2>
                    <AdminStatusBadge value={donation.status} />
                    {operation ? <AdminStatusBadge value={operation.operationType} /> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{donation.campaignTitle} · {donation.donorEmail}</p>
                  <p className="mt-2 text-lg font-bold text-ocean-900">{formatCurrency(donation.amount, donation.currency)}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/48">Submitted {donation.createdAt.toLocaleString("id-ID")}</p>
                </div>
                {proofUrl ? (
                  <a href={proofUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-coral-700 hover:text-coral-500">
                    Open payment proof
                  </a>
                ) : null}
              </div>

              {operation ? (
                isRefund ? (
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
                    <form action={reconcileDonationAction}>
                      <input type="hidden" name="next" value={pathname} />
                      <input type="hidden" name="donationId" value={donation.id} />
                      <input type="hidden" name="operationId" value={operation.id} />
                      <input type="hidden" name="status" value="paid" />
                      <Button type="submit">Verify payment</Button>
                    </form>
                    <form action={reconcileDonationAction}>
                      <input type="hidden" name="next" value={pathname} />
                      <input type="hidden" name="donationId" value={donation.id} />
                      <input type="hidden" name="operationId" value={operation.id} />
                      <input type="hidden" name="status" value="failed" />
                      <Button type="submit" tone="secondary">Reject proof</Button>
                    </form>
                  </div>
                )
              ) : null}
            </article>
          );
        })}
        {data.donations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/58">
            No donation payments need attention.
          </div>
        ) : null}
      </section>

      <AdminPagination
        pathname={pathname}
        pageParam="donationPage"
        pagination={data.pagination.donations}
        params={{
          donationQ: data.filters.donations.q || undefined,
          donationStatus: data.filters.donations.status === "all" ? undefined : data.filters.donations.status
        }}
      />
    </div>
  );
}
