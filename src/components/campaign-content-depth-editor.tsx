import { CalendarDays, Coins, ImagePlus, Save, Trash2, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
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

type CampaignContentDepthEditorProps = {
  campaign: CampaignContentCampaign;
  mediaItems: CampaignMediaItem[];
  budgetLineItems: CampaignBudgetLineItem[];
  timelinePhases: CampaignTimelinePhase[];
  teamMembers: OrganizationTeamMember[];
  returnTo: string;
  canManage: boolean;
};

const inputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500";
const textareaClassName =
  "min-h-24 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500";

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
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name={idName} value={idValue} />
      <label className="flex items-center gap-2 text-xs font-bold text-ocean-900/62">
        <input name="confirmDelete" type="checkbox" value="delete" className="size-4 accent-coral-500" required />
        Confirm
      </label>
      <Button type="submit" className="min-h-9 rounded-lg bg-coral-500 px-3 text-xs hover:bg-coral-700">
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </Button>
    </form>
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
    <form action={upsertCampaignMediaItemAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="campaignId" value={campaign.id} />
      {item ? <input type="hidden" name="mediaItemId" value={item.id} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Title">
          <input name="title" defaultValue={item?.title} placeholder="Gallery title" className={inputClassName} required />
        </Field>
        <Field label="Type">
          <select name="mediaType" defaultValue={item?.mediaType ?? "image"} className={inputClassName}>
            {["image", "video", "document"].map((type) => (
              <option key={type} value={type}>
                {labelize(type)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sort">
          <input name="sortOrder" type="number" min="0" step="1" defaultValue={item?.sortOrder ?? 0} className={inputClassName} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Upload image">
          <input name="fileUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
        </Field>
        <Field label="File URL">
          <input name="fileUrl" defaultValue={item?.fileUrl} placeholder="https://..." className={inputClassName} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Alt text">
          <input name="altText" defaultValue={item?.altText ?? ""} className={inputClassName} />
        </Field>
        <Field label="Provenance">
          <input name="provenance" defaultValue={item?.provenance ?? ""} placeholder="Partner-managed public gallery" className={inputClassName} />
        </Field>
      </div>
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
      {item ? <input type="hidden" name="budgetLineItemId" value={item.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Category">
          <input name="category" defaultValue={item?.category} placeholder="Restoration materials" className={inputClassName} required />
        </Field>
        <Field label="Planned amount">
          <input name="amount" type="number" min="1" step="1000" defaultValue={item?.amount} className={inputClassName} required />
        </Field>
        <Field label="Spent amount">
          <input name="spentAmount" type="number" min="0" step="1000" defaultValue={item?.spentAmount ?? 0} className={inputClassName} />
        </Field>
        <Field label="Sort">
          <input name="sortOrder" type="number" min="0" step="1" defaultValue={item?.sortOrder ?? 0} className={inputClassName} />
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={item?.description ?? ""} className={textareaClassName} />
      </Field>
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
      {item ? <input type="hidden" name="timelinePhaseId" value={item.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Title">
          <input name="title" defaultValue={item?.title} placeholder="Field restoration phase" className={inputClassName} required />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={item?.status ?? "planned"} className={inputClassName}>
            {["planned", "in_progress", "completed", "blocked"].map((status) => (
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
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Sort">
          <input name="sortOrder" type="number" min="0" step="1" defaultValue={item?.sortOrder ?? 0} className={inputClassName} />
        </Field>
        <Field label="Deliverable">
          <input name="deliverable" defaultValue={item?.deliverable ?? ""} className={inputClassName} />
        </Field>
        <Field label="Evidence note">
          <input name="evidenceNote" defaultValue={item?.evidenceNote ?? ""} className={inputClassName} />
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={item?.description ?? ""} className={textareaClassName} />
      </Field>
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
    <form action={upsertOrganizationTeamMemberAction} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="organizationId" value={campaign.organizationId} />
      {item ? <input type="hidden" name="teamMemberId" value={item.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Name">
          <input name="name" defaultValue={item?.name} className={inputClassName} required />
        </Field>
        <Field label="Role">
          <input name="role" defaultValue={item?.role} className={inputClassName} required />
        </Field>
        <Field label="Sort">
          <input name="sortOrder" type="number" min="0" step="1" defaultValue={item?.sortOrder ?? 0} className={inputClassName} />
        </Field>
        <label className="mt-7 flex items-center gap-2 text-sm font-bold text-ocean-900">
          <input name="isPublic" type="checkbox" defaultChecked={item?.isPublic ?? true} className="size-4 accent-coral-500" />
          Public
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Image URL">
          <input name="imageUrl" defaultValue={item?.imageUrl ?? ""} placeholder="https://..." className={inputClassName} />
        </Field>
        <Field label="Profile URL">
          <input name="profileUrl" defaultValue={item?.profileUrl ?? ""} placeholder="https://..." className={inputClassName} />
        </Field>
      </div>
      <Field label="Bio">
        <textarea name="bio" defaultValue={item?.bio ?? ""} className={textareaClassName} />
      </Field>
      <Button type="submit" tone="secondary" className="w-fit rounded-lg">
        <Save className="size-4" aria-hidden="true" />
        {item ? "Save Team Member" : "Add Team Member"}
      </Button>
    </form>
  );
}

function EditorSection({
  title,
  detail,
  icon: Icon,
  children
}: {
  title: string;
  detail: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-ocean-900/10 bg-white" open>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ocean-900">
        <Icon className="size-4 text-coral-700" aria-hidden="true" />
        {title}
        <span className="ml-auto text-xs font-semibold text-ocean-900/50">{detail}</span>
      </summary>
      <div className="grid gap-3 border-t border-ocean-900/10 p-4">{children}</div>
    </details>
  );
}

export function CampaignContentDepthEditor({
  campaign,
  mediaItems,
  budgetLineItems,
  timelinePhases,
  teamMembers,
  returnTo,
  canManage
}: CampaignContentDepthEditorProps) {
  const plannedBudget = budgetLineItems.reduce((total, item) => total + item.amount, 0);
  const spentBudget = budgetLineItems.reduce((total, item) => total + item.spentAmount, 0);

  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white shadow-soft">
      <div className="border-b border-ocean-900/10 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign content depth</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
              Manage public gallery, budget detail, timeline phases, and visible partner team members.
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

      <div className="grid gap-4 p-4">
        <EditorSection title="Media gallery" detail={`${mediaItems.length} records`} icon={ImagePlus}>
          {mediaItems.map((item) => (
            <details key={item.id} className="rounded-lg border border-ocean-900/10 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">{item.title}</summary>
              <div className="grid gap-3 border-t border-ocean-900/10 p-4">
                {canManage ? <MediaForm campaign={campaign} item={item} returnTo={returnTo} /> : null}
                {canManage ? <DeleteButton idName="mediaItemId" idValue={item.id} returnTo={returnTo} action={deleteCampaignMediaItemAction} /> : null}
              </div>
            </details>
          ))}
          {canManage ? <MediaForm campaign={campaign} returnTo={returnTo} /> : null}
        </EditorSection>

        <EditorSection title="Budget line items" detail={`${formatCurrency(spentBudget)} / ${formatCurrency(plannedBudget)}`} icon={Coins}>
          {budgetLineItems.map((item) => (
            <details key={item.id} className="rounded-lg border border-ocean-900/10 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ocean-900">
                {item.category} / {formatCurrency(item.spentAmount)} of {formatCurrency(item.amount)}
              </summary>
              <div className="grid gap-3 border-t border-ocean-900/10 p-4">
                {canManage ? <BudgetForm campaign={campaign} item={item} returnTo={returnTo} /> : null}
                {canManage ? <DeleteButton idName="budgetLineItemId" idValue={item.id} returnTo={returnTo} action={deleteCampaignBudgetLineItemAction} /> : null}
              </div>
            </details>
          ))}
          {canManage ? <BudgetForm campaign={campaign} returnTo={returnTo} /> : null}
        </EditorSection>

        <EditorSection title="Timeline phases" detail={`${timelinePhases.length} phases`} icon={CalendarDays}>
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
        </EditorSection>

        <EditorSection title="Organization team" detail={`${teamMembers.length} members`} icon={UserRound}>
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
        </EditorSection>
      </div>
    </section>
  );
}
