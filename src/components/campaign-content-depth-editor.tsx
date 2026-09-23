import { Plus, Save } from "lucide-react";
import type { ReactNode } from "react";

import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { FormTabs } from "@/components/ui/form-tabs";
import { Button } from "@/components/ui/button";
import { campaignBudgetCategories, campaignMediaTypes, campaignTimelinePhaseStatuses, organizationTeamRoles } from "@/lib/campaign-content";
import {
  deleteCampaignBudgetLineItemAction,
  deleteCampaignMediaItemAction,
  deleteCampaignTimelinePhaseAction,
  deleteOrganizationTeamMemberAction,
  upsertCampaignBudgetLineItemAction,
  upsertCampaignMediaItemAction,
  upsertCampaignTimelinePhaseAction,
  upsertOrganizationTeamMemberAction
} from "@/lib/portal-actions";
import { formatCurrency } from "@/lib/utils";

type CampaignContentCampaign = {
  id: string;
  organizationId: string;
  title: string;
  currency?: string;
  goalAmount?: string | number;
  contentCompleteness?: {
    score: number;
    missingLabels: string[];
  };
};

type CampaignMediaItem = {
  id: string;
  campaignId: string;
  title: string;
  mediaType: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  altText: string | null;
  caption: string | null;
  provenance: string | null;
  sortOrder: number;
  isFeatured: boolean;
};

type CampaignBudgetLineItem = {
  id: string;
  campaignId: string;
  category: string;
  description: string | null;
  amount: number;
  spentAmount: number;
  sortOrder: number;
};

type CampaignTimelinePhase = {
  id: string;
  campaignId: string;
  title: string;
  description: string | null;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  deliverable: string | null;
  evidenceNote: string | null;
  sortOrder: number;
};

type OrganizationTeamMember = {
  id: string;
  organizationId: string;
  name: string;
  role: string;
  bio: string | null;
  imageUrl: string | null;
  profileUrl: string | null;
  sortOrder: number;
  isPublic: boolean;
};

type CampaignEvidenceSpend = {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  currency: string;
  verificationStatus: string;
};

type CampaignContentSection = "all" | "media" | "budget" | "timeline" | "team";

type CampaignContentDepthEditorProps = {
  campaign: CampaignContentCampaign;
  mediaItems: CampaignMediaItem[];
  budgetLineItems: CampaignBudgetLineItem[];
  timelinePhases: CampaignTimelinePhase[];
  teamMembers: OrganizationTeamMember[];
  evidenceSpends?: CampaignEvidenceSpend[];
  section?: CampaignContentSection;
  returnTo: string;
  canManage: boolean;
};

const inputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2";
const textareaClassName =
  "min-h-24 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2";

function dateValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DeleteButton({
  idName,
  idValue,
  returnTo,
  action
}: {
  idName: string;
  idValue: string;
  returnTo: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const formId = `delete-campaign-content-${idName}-${idValue}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form id={formId} action={action}>
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name={idName} value={idValue} />
      </form>
      <AdminConfirmSubmit
        formId={formId}
        title="Delete campaign content?"
        body="This permanently removes this content record from the project. This action cannot be undone from the admin portal."
        triggerLabel="Delete"
        submitLabel="Delete permanently"
      />
    </div>
  );
}

function MediaForm({
  campaign,
  item,
  returnTo
}: {
  campaign: CampaignContentCampaign;
  item?: CampaignMediaItem;
  returnTo: string;
}) {
  return (
    <form action={upsertCampaignMediaItemAction} encType="multipart/form-data" className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="campaignId" value={campaign.id} />
      <input type="hidden" name="mediaType" value={item?.mediaType ?? "image"} />
      {item ? (
        <>
          <input type="hidden" name="mediaItemId" value={item.id} />
          <input type="hidden" name="sortOrder" value={item.sortOrder} />
        </>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title">
          <input name="title" defaultValue={item?.title} placeholder="Gallery title" className={inputClassName} required />
        </Field>
        <Field label="Type">
          <select value={item?.mediaType ?? "image"} className={inputClassName} disabled>
            {campaignMediaTypes.map((type) => (
              <option key={type} value={type}>
                {labelize(type)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={item ? "Replace image" : "Upload image"}>
        <input name="fileUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} required={!item} />
      </Field>
      <Field label="Alt text">
        <input name="altText" defaultValue={item?.altText ?? ""} className={inputClassName} />
      </Field>
      <Field label="Caption">
        <textarea name="caption" defaultValue={item?.caption ?? ""} className={textareaClassName} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
        <input name="isFeatured" type="checkbox" defaultChecked={item?.isFeatured ?? false} className="size-4 accent-coral-500" />
        Feature in campaign gallery
      </label>
      <Button type="submit" tone="secondary" className="w-fit rounded-lg">
        <Save className="size-4" aria-hidden="true" />
        {item ? "Save Media" : "Add Media"}
      </Button>
    </form>
  );
}

function BudgetForm({
  campaign,
  item,
  returnTo
}: {
  campaign: CampaignContentCampaign;
  item?: CampaignBudgetLineItem;
  returnTo: string;
}) {
  return (
    <form action={upsertCampaignBudgetLineItemAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="campaignId" value={campaign.id} />
      {item ? (
        <>
          <input type="hidden" name="budgetLineItemId" value={item.id} />
          <input type="hidden" name="sortOrder" value={item.sortOrder} />
        </>
      ) : null}
      <input type="hidden" name="spentAmount" value={item?.spentAmount ?? 0} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Category">
          <select name="category" defaultValue={item?.category ?? "Restoration materials"} className={inputClassName} required>
            {item?.category && !campaignBudgetCategories.includes(item.category as (typeof campaignBudgetCategories)[number]) ? (
              <option value={item.category}>{item.category}</option>
            ) : null}
            {campaignBudgetCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Planned amount">
          <input name="amount" type="number" min="0.01" step="0.01" defaultValue={item?.amount} className={inputClassName} required />
        </Field>
      </div>
      <p className="text-xs font-semibold leading-5 text-ocean-900/54">
        Actual spend is not typed here. It is calculated from verified evidence-backed expenses in this category.
      </p>
      <Button type="submit" tone="secondary" className="w-fit rounded-lg">
        <Save className="size-4" aria-hidden="true" />
        {item ? "Save Budget" : "Add Budget"}
      </Button>
    </form>
  );
}

function TimelineForm({
  campaign,
  item,
  returnTo
}: {
  campaign: CampaignContentCampaign;
  item?: CampaignTimelinePhase;
  returnTo: string;
}) {
  return (
    <form action={upsertCampaignTimelinePhaseAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="campaignId" value={campaign.id} />
      {item ? (
        <>
          <input type="hidden" name="timelinePhaseId" value={item.id} />
          <input type="hidden" name="sortOrder" value={item.sortOrder} />
        </>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Title">
          <input name="title" defaultValue={item?.title} placeholder="Field restoration phase" className={inputClassName} required />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={item?.status ?? "planned"} className={inputClassName}>
            {campaignTimelinePhaseStatuses.map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Starts">
          <input name="startsAt" type="date" defaultValue={dateValue(item?.startsAt ?? null)} className={inputClassName} />
        </Field>
        <Field label="Ends">
          <input name="endsAt" type="date" defaultValue={dateValue(item?.endsAt ?? null)} className={inputClassName} />
        </Field>
      </div>
      <Button type="submit" tone="secondary" className="w-fit rounded-lg">
        <Save className="size-4" aria-hidden="true" />
        {item ? "Save Timeline" : "Add Timeline"}
      </Button>
    </form>
  );
}

function TeamForm({
  campaign,
  item,
  returnTo
}: {
  campaign: CampaignContentCampaign;
  item?: OrganizationTeamMember;
  returnTo: string;
}) {
  return (
    <form action={upsertOrganizationTeamMemberAction} encType="multipart/form-data" className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="organizationId" value={campaign.organizationId} />
      {item ? (
        <>
          <input type="hidden" name="teamMemberId" value={item.id} />
          <input type="hidden" name="sortOrder" value={item.sortOrder} />
        </>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Field label="Name">
          <input name="name" defaultValue={item?.name} className={inputClassName} required />
        </Field>
        <Field label="Role">
          <select name="role" defaultValue={item?.role ?? "Project lead"} className={inputClassName} required>
            {item?.role && !organizationTeamRoles.includes(item.role as (typeof organizationTeamRoles)[number]) ? (
              <option value={item.role}>{item.role}</option>
            ) : null}
            {organizationTeamRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </Field>
        <label className="mt-7 flex items-center gap-2 text-sm font-bold text-ocean-900">
          <input name="isPublic" type="checkbox" defaultChecked={item?.isPublic ?? true} className="size-4 accent-coral-500" />
          Public
        </label>
      </div>
      <Button type="submit" tone="secondary" className="w-fit rounded-lg">
        <Save className="size-4" aria-hidden="true" />
        {item ? "Save Team Member" : "Add Team Member"}
      </Button>
    </form>
  );
}

export function CampaignContentDepthEditor({
  campaign,
  mediaItems,
  budgetLineItems,
  timelinePhases,
  teamMembers,
  evidenceSpends = [],
  section = "all",
  returnTo,
  canManage
}: CampaignContentDepthEditorProps) {
  const currency = campaign.currency ?? "USD";
  const fundingGoal = Number(campaign.goalAmount ?? 0);
  const plannedBudget = budgetLineItems.reduce((total, item) => total + item.amount, 0);
  const allocationDifference = fundingGoal - plannedBudget;
  const allocationPercent = fundingGoal > 0 ? Math.max(0, (plannedBudget / fundingGoal) * 100) : 0;
  const allocationBalanced = fundingGoal > 0 && Math.abs(allocationDifference) < 0.01;
  const verifiedEvidenceSpends = evidenceSpends.filter((item) => item.verificationStatus === "verified" && item.amount > 0);
  const spentBudget = verifiedEvidenceSpends.reduce((total, item) => total + item.amount, 0);
  const spendForCategory = (category: string) =>
    verifiedEvidenceSpends
      .filter((item) => item.category?.trim().toLowerCase() === category.trim().toLowerCase())
      .reduce((total, item) => total + item.amount, 0);

  const mediaContent = (
    <div className="grid gap-3">
      {mediaItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-5">
          <p className="font-bold text-ocean-900">No campaign media yet.</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/54">
            Add gallery images only when you are ready to enrich the public campaign page.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mediaItems.map((item) => (
            <details key={item.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white">
              <summary className="cursor-pointer list-none">
                <div className="grid grid-cols-[88px_1fr] items-center gap-3 p-3">
                  <div
                    className="h-16 rounded-lg bg-ocean-900/10 bg-cover bg-center"
                    style={{ backgroundImage: `url("${item.thumbnailUrl ?? item.fileUrl}")` }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ocean-900">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold capitalize text-ocean-900/48">
                      {labelize(item.mediaType)}{item.isFeatured ? " · Featured" : ""}
                    </p>
                  </div>
                </div>
              </summary>
              <div className="grid gap-3 border-t border-ocean-900/10 p-4">
                {canManage ? <MediaForm campaign={campaign} item={item} returnTo={returnTo} /> : null}
                {canManage ? <DeleteButton idName="mediaItemId" idValue={item.id} returnTo={returnTo} action={deleteCampaignMediaItemAction} /> : null}
              </div>
            </details>
          ))}
        </div>
      )}

      {canManage ? (
        <details className="rounded-lg border border-ocean-900/10 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-coral-700">
            <Plus className="size-4" aria-hidden="true" />
            Add media
          </summary>
          <div className="border-t border-ocean-900/10 p-4">
            <MediaForm campaign={campaign} returnTo={returnTo} />
          </div>
        </details>
      ) : null}
    </div>
  );

  const budgetContent = (
    <div className="grid gap-4">
      <div
        className={`rounded-lg border p-4 ${
          allocationBalanced
            ? "border-kelp-700/20 bg-kelp-100/60"
            : plannedBudget > fundingGoal && fundingGoal > 0
              ? "border-coral-700/20 bg-coral-100/55"
              : "border-ocean-900/10 bg-sand-50"
        }`}
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Budget allocation</p>
            <p className="mt-2 text-lg font-bold text-ocean-900">
              {formatCurrency(plannedBudget, currency)} of {formatCurrency(fundingGoal, currency)} allocated
            </p>
            <p className="mt-1 text-xs font-semibold text-ocean-900/54">
              Funding goal stays tied to the impact plan. Budget lines explain how that requirement will be used.
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-xs font-bold text-ocean-900">
            {allocationPercent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-ocean-900" style={{ width: `${Math.min(100, allocationPercent)}%` }} />
        </div>

        <p className="mt-3 text-xs font-bold text-ocean-900/62">
          {allocationBalanced
            ? "Allocation matches the funding goal."
            : allocationDifference > 0
              ? `${formatCurrency(allocationDifference, currency)} still needs allocation.`
              : fundingGoal > 0
                ? `${formatCurrency(Math.abs(allocationDifference), currency)} is over-allocated.`
                : "Set the impact plan before reconciling the budget."}
        </p>
      </div>

      {budgetLineItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5">
          <p className="font-bold text-ocean-900">No budget allocation yet.</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/54">
            Funding requirement: {formatCurrency(fundingGoal, currency)}. Add categories to show how the campaign plans to use those funds.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {budgetLineItems.map((item) => {
            const verifiedSpend = spendForCategory(item.category);
            const spendPercent = item.amount > 0 ? Math.min(100, (verifiedSpend / item.amount) * 100) : 0;

            return (
              <details key={item.id} className="rounded-lg border border-ocean-900/10 bg-white">
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-5">
                    <div>
                      <p className="text-sm font-bold text-ocean-900">{item.category}</p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/48">{item.description || "Budget allocation"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Planned</p>
                      <p className="mt-1 text-sm font-bold text-ocean-900">{formatCurrency(item.amount, currency)}</p>
                    </div>
                    <div className="text-left sm:min-w-32 sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/42">Verified spent</p>
                      <p className="mt-1 text-sm font-bold text-ocean-900">{formatCurrency(verifiedSpend, currency)}</p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/44">{spendPercent.toLocaleString("id-ID", { maximumFractionDigits: 0 })}% spent</p>
                    </div>
                  </div>
                </summary>
                <div className="grid gap-3 border-t border-ocean-900/10 p-4">
                  {canManage ? <BudgetForm campaign={campaign} item={item} returnTo={returnTo} /> : null}
                  {canManage ? <DeleteButton idName="budgetLineItemId" idValue={item.id} returnTo={returnTo} action={deleteCampaignBudgetLineItemAction} /> : null}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {canManage ? (
        <details className="rounded-lg border border-ocean-900/10 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-coral-700">
            <Plus className="size-4" aria-hidden="true" />
            Add budget item
          </summary>
          <div className="border-t border-ocean-900/10 p-4">
            <BudgetForm campaign={campaign} returnTo={returnTo} />
          </div>
        </details>
      ) : null}

      {verifiedEvidenceSpends.length > 0 ? (
        <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-coral-700">Evidence-backed expenses</h3>
          <div className="mt-3 grid gap-2">
            {verifiedEvidenceSpends.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-1 rounded-lg bg-sand-50 px-3 py-2 text-sm sm:flex-row sm:items-center">
                <div>
                  <p className="font-bold text-ocean-900">{item.title}</p>
                  <p className="text-xs font-semibold text-ocean-900/52">{item.category || "Uncategorized verified expense"}</p>
                </div>
                <p className="font-bold text-ocean-900">{formatCurrency(item.amount, item.currency || currency)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const timelineContent = (
    <div className="grid gap-3">
      {timelinePhases.map((item) => (
        <details key={item.id} className="rounded-lg border border-ocean-900/10 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold capitalize text-ocean-900">
            {item.title} / {labelize(item.status)}
          </summary>
          <div className="grid gap-3 border-t border-ocean-900/10 p-4">
            {canManage ? <TimelineForm campaign={campaign} item={item} returnTo={returnTo} /> : null}
            {canManage ? <DeleteButton idName="timelinePhaseId" idValue={item.id} returnTo={returnTo} action={deleteCampaignTimelinePhaseAction} /> : null}
          </div>
        </details>
      ))}
      {canManage ? <TimelineForm campaign={campaign} returnTo={returnTo} /> : null}
    </div>
  );

  const teamContent = (
    <div className="grid gap-3">
      {teamMembers.map((item) => (
        <details key={item.id} className="rounded-lg border border-ocean-900/10 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">
            {item.name} / {item.role}
          </summary>
          <div className="grid gap-3 border-t border-ocean-900/10 p-4">
            {canManage ? <TeamForm campaign={campaign} item={item} returnTo={returnTo} /> : null}
            {canManage ? <DeleteButton idName="teamMemberId" idValue={item.id} returnTo={returnTo} action={deleteOrganizationTeamMemberAction} /> : null}
          </div>
        </details>
      ))}
      {canManage ? <TeamForm campaign={campaign} returnTo={returnTo} /> : null}
    </div>
  );

  if (section !== "all") {
    const sectionMeta = {
      media: {
        title: "Campaign media",
        description: "Manage the public gallery and reusable campaign images."
      },
      budget: {
        title: "Budget plan",
        description: "Allocate the impact-based funding goal and reconcile verified spend."
      },
      timeline: {
        title: "Delivery timeline",
        description: "Track campaign phases, dates, and field delivery status."
      },
      team: {
        title: "Public team",
        description: "Manage public partner profiles associated with this organization."
      }
    }[section];

    const content = {
      media: mediaContent,
      budget: budgetContent,
      timeline: timelineContent,
      team: teamContent
    }[section];

    return (
      <section className="grid gap-4">
        <div className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">{sectionMeta.title}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">{sectionMeta.description}</p>
        </div>
        {content}
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign resources</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
              Manage campaign media, budget allocation, delivery timeline, and public partner profiles.
            </p>
          </div>
          {campaign.contentCompleteness ? (
            <span className="inline-flex min-h-9 items-center rounded-lg bg-ocean-50 px-3 text-sm font-bold text-ocean-700">
              {campaign.contentCompleteness.score}% complete
            </span>
          ) : null}
        </div>
        {campaign.contentCompleteness?.missingLabels.length ? (
          <p className="mt-3 text-xs font-bold text-ocean-900/52">Missing: {campaign.contentCompleteness.missingLabels.join(", ")}</p>
        ) : null}
      </div>

      <FormTabs
        ariaLabel={`${campaign.title} resource editors`}
        tabs={[
          { id: "media", label: "Media", description: "Gallery assets", badge: mediaItems.length.toLocaleString("id-ID") },
          { id: "budget", label: "Budget", description: "Plan and verified spend", badge: `${formatCurrency(spentBudget, currency)} / ${formatCurrency(plannedBudget, currency)}` },
          { id: "timeline", label: "Timeline", description: "Field phases", badge: timelinePhases.length.toLocaleString("id-ID") },
          { id: "team", label: "Team", description: "Public partner profiles", badge: teamMembers.length.toLocaleString("id-ID") }
        ]}
      >
        {mediaContent}
        {budgetContent}
        {timelineContent}
        {teamContent}
      </FormTabs>
    </section>
  );
}
