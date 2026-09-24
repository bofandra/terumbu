import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImageIcon, Video } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDomainNav, adminExpeditionNavItems } from "@/components/admin/admin-domain-nav";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { moderateExpeditionMediaAction } from "@/lib/expedition-media-actions";
import { getAdminExpeditionMediaSubmissions } from "@/lib/expedition-media";

export const metadata = { title: "Traveler Media Moderation" };
export const dynamic = "force-dynamic";

const pathname = "/admin/expeditions/media";

type PageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminExpeditionMediaPage({ searchParams }: PageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const submissions = await getAdminExpeditionMediaSubmissions();
  const pendingCount = submissions.filter((item) => item.status === "pending").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions / Traveler media"
        title="Traveler media moderation"
        description="Review media submitted by completed expedition participants before anything appears on a public expedition page."
      />
      <AdminDomainNav items={adminExpeditionNavItems} active={pathname} />

      {params?.saved ? <AdminAlert tone="success">Traveler media moderation saved.</AdminAlert> : null}
      {params?.error ? (
        <AdminAlert tone="error">
          {params.error === "reason" ? "Add a reason when rejecting traveler media." : "Traveler media moderation could not be completed."}
        </AdminAlert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/54">Pending review</p>
          <p className="mt-2 text-3xl font-bold text-ocean-900">{pendingCount}</p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/54">Published</p>
          <p className="mt-2 text-3xl font-bold text-ocean-900">{submissions.filter((item) => item.status === "published").length}</p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/54">Total submissions</p>
          <p className="mt-2 text-3xl font-bold text-ocean-900">{submissions.length}</p>
        </article>
      </section>

      <section className="grid gap-4">
        {submissions.map((submission) => (
          <article key={submission.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-lg bg-ocean-50">
                {submission.mediaType === "photo" ? (
                  <div className="relative h-48">
                    <Image
                      src={submission.mediaUrl}
                      alt={submission.caption ?? "Traveler-submitted expedition photo"}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="220px"
                    />
                  </div>
                ) : (
                  <a
                    href={submission.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-48 flex-col items-center justify-center gap-3 p-5 text-center font-bold text-sky-700"
                  >
                    <Video size={38} aria-hidden="true" />
                    Open traveler video
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
                      {submission.mediaType} · {submission.bookingCode}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-ocean-900">{submission.expeditionTitle}</h2>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/54">
                      {submission.submitterName ?? submission.submitterUserName ?? submission.submitterEmail ?? "Verified participant"} · {submission.createdAt.toLocaleString("en-US")}
                    </p>
                  </div>
                  <AdminStatusBadge value={submission.status} />
                </div>

                {submission.caption ? <p className="mt-4 rounded-lg bg-sand-50 p-4 text-sm leading-6 text-ocean-900/68">{submission.caption}</p> : null}
                {submission.rejectionReason ? <p className="mt-3 text-sm font-semibold text-coral-700">Reason: {submission.rejectionReason}</p> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/expeditions/${submission.expeditionSlug}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900">
                    <ImageIcon size={16} aria-hidden="true" /> Public expedition
                  </Link>
                </div>

                {submission.status === "pending" ? (
                  <div className="mt-5 grid gap-3 border-t border-ocean-900/10 pt-4">
                    <form action={moderateExpeditionMediaAction}>
                      <input type="hidden" name="submissionId" value={submission.id} />
                      <input type="hidden" name="decision" value="publish" />
                      <Button type="submit">Approve & publish</Button>
                    </form>
                    <form action={moderateExpeditionMediaAction} className="grid gap-2">
                      <input type="hidden" name="submissionId" value={submission.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <textarea
                        name="rejectionReason"
                        placeholder="Reason for rejection or what the traveler should change"
                        className="min-h-20 rounded-lg border border-ocean-900/14 px-3 py-2 text-sm font-semibold"
                        required
                      />
                      <Button type="submit" tone="secondary" className="w-fit">Reject</Button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {submissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/58">
            No traveler media has been submitted yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
