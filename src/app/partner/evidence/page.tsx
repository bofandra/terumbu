import Image from "next/image";
import { Camera, FileCheck2, MessageSquare, RotateCcw } from "lucide-react";

import { PartnerPageHeader, StatusBadge, inputClassName, textareaClassName } from "@/components/partner-portal-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { reviseEvidenceAction } from "@/lib/portal-actions";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Evidence"
};

export const dynamic = "force-dynamic";

function isImage(value: string | null) {
  return Boolean(value && (value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value)));
}

export default async function PartnerEvidencePage() {
  const user = await requireRole(["partner", "admin"], "/partner/evidence");
  const data = await getPartnerPortalData(user.id);
  const pending = data.evidence.filter((item) => item.verificationStatus === "submitted" || item.verificationStatus === "in_review");
  const needsResponse = data.evidence.filter((item) => item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected");
  const verified = data.evidence.filter((item) => item.verificationStatus === "verified");

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Evidence"
        description="Track partner-submitted photos, documents, and field notes through admin review. Revise rejected records and resubmit them without creating duplicates."
        actionHref="/partner/activity"
        actionLabel="Submit activity"
      />

      <section className="grid gap-3 md:grid-cols-4" aria-label="Evidence status summary">
        {[
          { label: "Evidence records", value: data.evidence.length, icon: FileCheck2 },
          { label: "Pending review", value: pending.length, icon: MessageSquare },
          { label: "Needs response", value: needsResponse.length, icon: RotateCcw },
          { label: "Verified", value: verified.length, icon: Camera }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value.toLocaleString("id-ID")}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><Icon className="size-5" aria-hidden="true" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold text-ocean-900">Evidence records</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Newest submissions first</p>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.evidence.map((item) => (
            <article key={item.id} className="grid gap-4 p-4 lg:grid-cols-[180px_1fr]">
              <div className="overflow-hidden rounded-lg bg-ocean-50">
                {isImage(item.fileUrl) ? (
                  item.fileUrl.startsWith("data:image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.fileUrl} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <Image src={item.fileUrl} alt={item.title} width={360} height={270} className="aspect-[4/3] w-full object-cover" />
                  )
                ) : (
                  <div className="grid aspect-[4/3] place-items-center text-sm font-bold text-ocean-900/54">Document</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-ocean-900">{item.title}</h3>
                  <StatusBadge value={item.verificationStatus} />
                </div>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle} · {item.evidenceType}</p>
                <p className="mt-1 text-xs font-bold text-ocean-900/46">{item.evidenceCode} · submitted {item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                {item.latestReviewNote ? (
                  <div className="mt-3 rounded-lg bg-coral-100 p-3 text-sm font-semibold leading-6 text-coral-700">
                    Review note: {item.latestReviewNote}
                  </div>
                ) : null}
                {item.reviewEvents.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">Review history</p>
                    {item.reviewEvents.slice(-3).map((event) => (
                      <div key={event.id} className="rounded-lg bg-sand-50 px-3 py-2 text-xs font-semibold leading-5 text-ocean-900/62">
                        <p className="font-bold text-ocean-900">{event.label}</p>
                        <p>{event.actor} · {event.occurredAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                        {event.note ? <p className="mt-1">{event.note}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {(item.verificationStatus === "rejected" || item.verificationStatus === "needs_clarification") && data.capabilities.canReviseEvidence ? (
                  <form action={reviseEvidenceAction} className="mt-4 grid gap-3 rounded-lg bg-sand-50 p-4">
                    <input type="hidden" name="evidenceId" value={item.id} />
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">Title<input name="title" className={inputClassName} defaultValue={item.title} required /></label>
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">Response note<textarea name="body" className={textareaClassName} placeholder="Explain the clarification or what changed in this revision." /></label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">Evidence URL<input name="fileUrl" className={inputClassName} defaultValue={item.fileUrl} required /></label>
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">Replace file<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" className={inputClassName} /></label>
                    </div>
                    <Button type="submit" className="justify-self-start"><RotateCcw size={17} /> {item.verificationStatus === "needs_clarification" ? "Submit clarification" : "Resubmit evidence"}</Button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
          {data.evidence.length === 0 ? (
            <div className="p-6">
              <p className="font-bold text-ocean-900">No evidence submitted yet.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/62">Use the Activity page to submit verification photos, field reports, or other records.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
