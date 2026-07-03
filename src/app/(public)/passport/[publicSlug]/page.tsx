import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileBadge,
  Globe2,
  Heart,
  Info,
  MapPinned,
  ShieldCheck,
  Trophy,
  Users,
  Waves
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PassportCopyButton } from "@/components/passport-copy-button";
import { ButtonLink } from "@/components/ui/button";
import { evidenceSourceHref } from "@/lib/domain";
import { getPublicPassport } from "@/lib/queries";

export const dynamic = "force-dynamic";

const heroImage = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=80";

type PublicPassport = NonNullable<Awaited<ReturnType<typeof getPublicPassport>>>;
type PassportItem = PublicPassport["items"][number];

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const passport = await getPublicPassport(publicSlug);

  return {
    title: passport ? `${passport.displayName} Impact Passport` : "Impact Passport",
    description: passport
      ? `${passport.displayName}'s verified Terumbu.eco conservation profile with impact activities, certificates, and supporting evidence.`
      : "Verified Terumbu.eco Impact Passport"
  };
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function shortDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Pending";
}

function initialsForName(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OH";
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === "string" ? value : null;
}

function passportItemSourceHref(item: PassportItem) {
  const campaignSlug = metadataString(item.metadata, "campaignSlug") ?? metadataString(item.metadata, "campaign");
  const evidenceCode = metadataString(item.metadata, "evidenceCode");

  if (campaignSlug && evidenceCode) {
    return evidenceSourceHref(campaignSlug, evidenceCode);
  }

  if (campaignSlug) {
    return `/campaigns/${campaignSlug}#evidence`;
  }

  return item.evidenceUrl;
}

function metadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return 0;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function passportId(publicSlug: string, issuedAt: Date | null | undefined) {
  const checksum = publicSlug.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  const year = issuedAt?.getFullYear() ?? new Date().getFullYear();

  return `TE-ID-${year}-${String(checksum).padStart(6, "0")}`;
}

function publicPassportUrl(publicSlug: string) {
  return `https://terumbu.eco/passport/${publicSlug}`;
}

function activityTypeLabel(value: string) {
  const labels: Record<string, string> = {
    donation: "Funding",
    ecosystem: "Ecosystem",
    expedition: "Field activity",
    certificate: "Certificate",
    badge: "Achievement",
    volunteer: "Volunteering"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function publicImpactStory(passport: PublicPassport) {
  if (passport.story || passport.bio) {
    return passport.story ?? passport.bio;
  }

  return `${passport.displayName} has ${passport.summary.verifiedActivities.toLocaleString(
    "id-ID"
  )} verified conservation activities on Terumbu.eco, including project support, ecosystem sponsorships, field participation, and learning records.`;
}

function publicMetrics(passport: PublicPassport) {
  return [
    {
      label: "Verified activities",
      value: passport.summary.verifiedActivities.toLocaleString("id-ID"),
      support: "Terumbu or partner records",
      icon: ShieldCheck
    },
    {
      label: "Coral fragments",
      value: passport.summary.coralCount.toLocaleString("id-ID"),
      support: "financially supported",
      icon: Waves
    },
    {
      label: "Field activities",
      value: passport.summary.fieldCount.toLocaleString("id-ID"),
      support: "expeditions or volunteering",
      icon: MapPinned
    },
    {
      label: "Certificates",
      value: passport.summary.certificateCount.toLocaleString("id-ID"),
      support: "learning credentials",
      icon: FileBadge
    },
    {
      label: "Volunteer hours",
      value: passport.summary.volunteerHours.toLocaleString("id-ID"),
      support: "verified records",
      icon: Users
    },
    {
      label: "Projects supported",
      value: Math.max(passport.summary.projectCount, passport.summary.donationCount > 0 ? 1 : 0).toLocaleString("id-ID"),
      support: "public-safe count",
      icon: Heart
    }
  ];
}

function itemLocations(items: PassportItem[]) {
  return Array.from(
    new Set(
      items
        .map((item) => metadataString(item.metadata, "location") ?? metadataString(item.metadata, "region") ?? metadataString(item.metadata, "site"))
        .filter(Boolean)
    )
  ) as string[];
}

export default async function PublicPassportPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const passport = await getPublicPassport(publicSlug);

  if (!passport) {
    notFound();
  }

  const publicUrl = publicPassportUrl(passport.publicSlug);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`;
  const locations = itemLocations(passport.items);
  const ecosystems = passport.items.filter((item) => item.itemType === "ecosystem" || metadataNumber(item.metadata, "fragments") > 0).slice(0, 3);
  const fieldItems = passport.items.filter((item) => ["expedition", "volunteer"].includes(item.itemType)).slice(0, 3);
  const certificates = passport.items.filter((item) => item.itemType === "certificate").slice(0, 3);
  const achievements = passport.items.filter((item) => item.itemType === "badge").slice(0, 4);
  const nextMilestone =
    passport.summary.coralCount > 0 && passport.summary.coralCount < 50
      ? `Sponsor ${Math.max(0, 50 - passport.summary.coralCount).toLocaleString("id-ID")} more coral fragments to reach Reef Protector.`
      : "Continue building a verified conservation record through projects, learning, and field participation.";

  return (
    <main className="bg-sand-50">
      <section
        className="bg-ocean-900 text-white"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(1,31,50,0.94), rgba(1,31,50,0.64), rgba(1,31,50,0.28)), url('${heroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-coral-200">
              <ShieldCheck size={18} aria-hidden="true" />
              Public Impact Passport
            </p>
            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-4 border-white/85 bg-coral-500 text-2xl font-bold shadow-soft">
                {initialsForName(passport.displayName)}
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">{passport.displayName}</h1>
                <p className="mt-2 text-xl font-bold text-kelp-200">Ocean Hero - Level {passport.heroLevel}</p>
                <p className="mt-3 text-sm font-semibold text-white/68">{passport.location ?? "Indonesia"}</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/76">{publicImpactStory(passport)}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <PassportCopyButton value={publicUrl} label="Share Impact Passport" className="border-white/18 bg-white text-ocean-900 hover:bg-sand-50" />
              <ButtonLink href="/signup" tone="primary">
                Join Terumbu.eco
              </ButtonLink>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/16 bg-ocean-900/72 p-5 backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-kelp-400 text-ocean-900">
                <CheckCircle2 size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold">{passport.verification.status}</p>
                <p className="mt-1 text-sm text-white/62">
                  {passport.verification.activityCount.toLocaleString("id-ID")} activities · {passport.verification.certificateCount.toLocaleString("id-ID")} certificates
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white p-4">
              <Image src={qrSrc} alt={`QR code for ${passport.displayName}'s Impact Passport`} width={160} height={160} className="mx-auto size-40" />
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="text-white/52">Passport ID</dt>
                <dd className="font-bold">{passportId(passport.publicSlug, passport.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-white/52">Last verified</dt>
                <dd className="font-bold">{formatDate(passport.verification.lastVerifiedAt)}</dd>
              </div>
              <div>
                <dt className="text-white/52">Visibility</dt>
                <dd className="font-bold capitalize">{passport.visibility === "link" ? "Link only" : passport.visibility}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {publicMetrics(passport).map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <Icon className="text-coral-500" size={24} aria-hidden="true" />
                <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                <h2 className="mt-1 text-sm font-bold text-ocean-900">{item.label}</h2>
                <p className="mt-2 text-xs font-semibold text-ocean-900/56">{item.support}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-6">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My conservation journey</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Impact story</h2>
            <p className="mt-4 text-sm leading-7 text-ocean-900/68">{publicImpactStory(passport)}</p>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Where impact appears</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Approximate impact locations</h2>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Public locations are intentionally approximate to protect restoration sites and private travel details.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">
                <Globe2 size={15} aria-hidden="true" />
                Public-safe map
              </span>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-ocean-900">
                <iframe
                  title="OpenStreetMap view of approximate Indonesian impact locations"
                  className="absolute inset-0 h-full w-full border-0 opacity-70"
                  loading="lazy"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=94%2C-11%2C142%2C6&layer=mapnik"
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,52,63,0.72),rgba(24,143,138,0.18))]" />
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/92 p-4 text-sm font-bold text-ocean-900 backdrop-blur">
                  Exact ecosystem coordinates and travel routes are not displayed publicly.
                </div>
              </div>
              <div className="grid gap-3" aria-label="Impact locations as list">
                {locations.length > 0 ? (
                  locations.map((location) => (
                    <div key={location} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                      <p className="flex items-center gap-2 font-bold text-ocean-900">
                        <MapPinned size={17} aria-hidden="true" className="text-coral-500" />
                        {location}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-ocean-900/56">Approximate public location</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
                    Public location records will appear once activities include safe regional data.
                  </p>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Portfolio overview</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Impact categories</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {passport.categorySummaries.map((category) => (
                <div key={category.label} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ocean-900">{category.label}</p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/56">{category.support}</p>
                    </div>
                    <span className="text-xl font-bold text-ocean-900">{category.value.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Verified timeline</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Conservation activity</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">
                <CheckCircle2 size={15} aria-hidden="true" />
                Public records only
              </span>
            </div>
            <ol className="mt-6 space-y-5">
              {passport.items.map((item) => (
                <li key={`${item.itemType}-${item.title}-${item.occurredAt.toISOString()}`} className="grid gap-3 sm:grid-cols-[98px_1fr]">
                  <time className="text-xs font-bold text-ocean-900/52">{shortDate(item.occurredAt)}</time>
                  <div className="border-l-2 border-ocean-100 pl-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{activityTypeLabel(item.itemType)}</p>
                    <h3 className="mt-1 font-bold text-ocean-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-ocean-900/58">{item.description ?? "Verified activity added to this Impact Passport."}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-kelp-100 px-2 py-1 text-kelp-700">{metadataString(item.metadata, "verificationStatus") ?? "Verified by Terumbu.eco"}</span>
                      {passportItemSourceHref(item) ? (
                        <Link href={passportItemSourceHref(item)!} className="inline-flex items-center gap-1 rounded-full bg-ocean-50 px-2 py-1 text-ocean-900 hover:text-coral-700">
                          Evidence source
                          <ExternalLink size={13} aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {passport.items.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
                This public passport does not have visible activity records yet.
              </p>
            ) : null}
          </article>

          <section className="grid gap-6 lg:grid-cols-2">
            <RecordSection title="Ecosystems supported" eyebrow="Sponsored ecosystems" items={ecosystems} empty="Visible sponsored ecosystem records will appear here." icon={Waves} />
            <RecordSection title="Field experience" eyebrow="Expeditions and volunteering" items={fieldItems} empty="Visible field activities will appear here." icon={MapPinned} />
          </section>
        </div>

        <aside className="grid gap-6 lg:content-start">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Featured milestones</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Meaningful moments</h2>
            <div className="mt-5 grid gap-3">
              {passport.milestones.map((milestone) => (
                <div key={`${milestone.label}-${milestone.title}`} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{milestone.label}</p>
                  <p className="mt-2 font-bold text-ocean-900">{milestone.title}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/52">{formatDate(milestone.occurredAt)}</p>
                </div>
              ))}
            </div>
            {passport.milestones.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">Milestones will appear as public records are added.</p> : null}
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Certificate vault</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Public credentials</h2>
            <div className="mt-5 grid gap-3">
              {certificates.map((certificate) => (
                <CredentialCard key={`${certificate.title}-${certificate.occurredAt.toISOString()}`} item={certificate} />
              ))}
            </div>
            {certificates.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">No public certificates yet.</p> : null}
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Achievements</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Badges</h2>
            <div className="mt-5 grid gap-3">
              {achievements.map((achievement) => (
                <div key={`${achievement.title}-${achievement.occurredAt.toISOString()}`} className="flex items-start gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <span className="flex size-11 items-center justify-center rounded-full bg-coral-500 text-white">
                    <Trophy size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold text-ocean-900">{achievement.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/56">{achievement.description ?? "Verified achievement."}</p>
                  </div>
                </div>
              ))}
            </div>
            {achievements.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">Badges will appear as achievements are published.</p> : null}
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Next milestone</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{nextMilestone}</h2>
            <ButtonLink href="/campaigns" className="mt-5">
              Explore projects
              <ChevronRight size={17} aria-hidden="true" />
            </ButtonLink>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Methodology</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">How this impact is calculated</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-ocean-900/64">
              <p className="flex gap-3">
                <Info size={17} aria-hidden="true" className="mt-1 shrink-0 text-coral-500" />
                Activities are direct records from Terumbu.eco or approved partner workflows.
              </p>
              <p className="flex gap-3">
                <Info size={17} aria-hidden="true" className="mt-1 shrink-0 text-coral-500" />
                Sponsored ecosystem counts represent units financially supported; survival and monitoring are reported separately.
              </p>
              <p className="flex gap-3">
                <Info size={17} aria-hidden="true" className="mt-1 shrink-0 text-coral-500" />
                Exact donations, receipts, private coordinates, and draft records are not shown on public passports.
              </p>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}

function RecordSection({
  title,
  eyebrow,
  items,
  empty,
  icon: Icon
}: {
  title: string;
  eyebrow: string;
  items: PassportItem[];
  empty: string;
  icon: typeof Waves;
}) {
  return (
    <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.occurredAt.toISOString()}`} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-white">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-ocean-900">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-ocean-900/56">{item.description ?? `${activityTypeLabel(item.itemType)} record.`}</p>
                <p className="mt-2 text-xs font-bold text-kelp-700">Verified · {shortDate(item.occurredAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">{empty}</p> : null}
    </article>
  );
}

function CredentialCard({ item }: { item: PassportItem }) {
  const credentialId = metadataString(item.metadata, "credentialId") ?? metadataString(item.metadata, "certificateNumber") ?? "Credential ID pending";

  return (
    <div className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-kelp-100 text-kelp-700">
          <FileBadge size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="font-bold text-ocean-900">{item.title}</p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/56">{credentialId}</p>
          <p className="mt-2 text-xs font-bold text-kelp-700">Issued {shortDate(item.occurredAt)} · Verified</p>
        </div>
      </div>
    </div>
  );
}
