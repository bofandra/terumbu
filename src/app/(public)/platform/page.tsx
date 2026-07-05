import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileBadge,
  FileText,
  Globe2,
  HeartHandshake,
  HelpCircle,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  Sprout,
  UserCircle,
  Users,
  Waves
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Platform"
};

type Workflow = {
  title: string;
  summary: string;
  routes: string;
  icon: LucideIcon;
  steps: string[];
  outcome: string;
};

type RoleGuide = {
  role: string;
  label: string;
  purpose: string;
  entry: string;
  allowed: string[];
  restricted: string;
  icon: LucideIcon;
};

const platformHighlights = [
  {
    label: "Public trust layer",
    value: "Campaigns, expeditions, Academy, impact map, partners, and public passport records.",
    icon: Globe2
  },
  {
    label: "Supporter workspace",
    value: "Personal dashboard for donations, sponsored ecosystems, trips, lessons, certificates, and Impact Passport.",
    icon: Users
  },
  {
    label: "Evidence operations",
    value: "Partner submissions, admin verification, audit logs, campaign updates, and impact-site evidence history.",
    icon: ShieldCheck
  },
  {
    label: "Corporate reporting",
    value: "Program budgets, project portfolios, contribution ledgers, evidence bundles, exports, and public impact pages.",
    icon: Building2
  }
];

const workflows: Workflow[] = [
  {
    title: "Public discovery to donation",
    summary: "A visitor moves from impact discovery into a paid contribution that updates campaign records and personal impact.",
    routes: "/campaigns, /campaigns/[slug], /checkout/donation, /dashboard",
    icon: HeartHandshake,
    steps: [
      "Visitor reviews a published campaign with partner verification, progress, updates, impact targets, and evidence.",
      "Supporter chooses a donation or ecosystem sponsorship intent and completes checkout with contact details and amount.",
      "Payment state is recorded through the transaction layer, then paid or reconciled records update campaign totals.",
      "Receipts and email logs are created for successful donations.",
      "Signed-in users see donations, sponsored ecosystems, and related milestones in the dashboard and Impact Passport."
    ],
    outcome: "Public campaign totals, donor history, receipts, and passport milestones stay connected to the same contribution."
  },
  {
    title: "Expedition booking to field participation",
    summary: "Conservation trips connect destination discovery with participant records, seat capacity, and dashboard visibility.",
    routes: "/expeditions, /expeditions/[slug], /checkout/expedition, /dashboard/expeditions",
    icon: Compass,
    steps: [
      "Traveler reviews the expedition region, itinerary, impact allocation, departure options, preparation notes, and availability.",
      "Checkout stores contact details, participant names, selected departure, total amount, and payment state.",
      "Confirmed bookings increase seats booked for the departure and create participant records.",
      "Confirmation email logs are queued so operational teams can track communication side effects.",
      "The user expedition dashboard lists upcoming and historical field activity."
    ],
    outcome: "The public trip catalog and private user booking history remain consistent after checkout and refresh."
  },
  {
    title: "Academy learning to certificate",
    summary: "Courses convert conservation education into verified learning progress and shareable credentials.",
    routes: "/academy, /academy/courses/[slug], /dashboard/academy, /dashboard/certificates",
    icon: BookOpen,
    steps: [
      "Learner searches or filters Academy courses and opens a course detail page.",
      "Enrollment is created once and reused on repeat visits.",
      "Lesson progress, assessment attempts, scores, and completion status are stored per user.",
      "A passing final assessment issues a certificate with a certificate number and public slug.",
      "Certificates can become Impact Passport items when the user has a passport."
    ],
    outcome: "Learning records become durable credentials rather than isolated course activity."
  },
  {
    title: "Partner update to verified public evidence",
    summary: "Field partners can submit updates and evidence, while admins control verification before claims become stronger trust signals.",
    routes: "/partner, /partner/activity, /admin/evidence, /campaigns/[slug]",
    icon: ClipboardCheck,
    steps: [
      "Partner opens the portal to review campaign summaries, evidence status, recent updates, and submission forms.",
      "Partner creates a public update, an evidence-only record, or a combined activity record linked to a campaign.",
      "New evidence starts in a submitted or review state.",
      "Admin verifies or rejects the evidence from the admin evidence workflow and records an audit event.",
      "Verified evidence can appear on campaign pages, impact-site histories, and corporate evidence centers when relevant."
    ],
    outcome: "Partner field activity is useful quickly, but verification stays under platform governance."
  },
  {
    title: "Corporate program to report export",
    summary: "Corporate ESG and CSR teams manage programs separately from individual donations, then report against funded projects and evidence.",
    routes: "/corporate, /corporate/projects, /corporate/evidence, /corporate/reports",
    icon: Building2,
    steps: [
      "Admin creates a corporate account and program, then assigns a user or grants corporate permissions.",
      "Corporate user manages programs, project portfolio allocations, contribution status, budgets, and employee engagement.",
      "Contribution ledger records can count toward public campaign progress only when eligible and configured to do so.",
      "Verified campaign evidence is linked into the corporate evidence center for funded projects.",
      "Reports bundle portfolio, contribution, financial, and evidence data into export records."
    ],
    outcome: "Corporate impact is auditable without mixing organization support into personal donation records."
  },
  {
    title: "Admin operations and audit control",
    summary: "Platform admins keep campaign, partner, evidence, user, report, and payment workflows coherent across the system.",
    routes: "/admin, /admin/campaigns, /admin/partners, /admin/reports, /admin/audit",
    icon: ClipboardList,
    steps: [
      "Admin manages campaigns, expeditions, partners, impact sites, Academy content, reports, users, and evidence.",
      "Admin reconciles payment status when operational review is required.",
      "Admin changes partner verification levels and campaign status while preserving public-page stability.",
      "Important admin actions write or preserve audit log records.",
      "Public pages continue to expose only approved, public-safe information after operational changes."
    ],
    outcome: "The platform can grow operationally while keeping public trust pages and private workspaces separated."
  }
];

const roles: RoleGuide[] = [
  {
    role: "Guest",
    label: "Public visitor",
    purpose: "Discover conservation work before creating an account.",
    entry: "/",
    allowed: ["Homepage, campaigns, expeditions, Academy, impact map, public partner pages", "Donation and expedition checkout entry points", "Public Impact Passport pages when visibility allows"],
    restricted: "Redirected to login for dashboard, corporate, partner, and admin workspaces.",
    icon: Waves
  },
  {
    role: "User",
    label: "Supporter account",
    purpose: "Donate, book expeditions, learn, collect certificates, and manage a personal Impact Passport.",
    entry: "/dashboard",
    allowed: ["Personal dashboard, donations, corals, expeditions, Academy progress, certificates, saved items, settings", "Own Impact Passport and visibility controls", "All public discovery routes"],
    restricted: "No access to admin operations, partner portal, or corporate workspace unless separately granted.",
    icon: UserCircle
  },
  {
    role: "Corporate Admin",
    label: "ESG or CSR workspace",
    purpose: "Manage a company program, funded projects, employees, evidence, budgets, and report exports.",
    entry: "/corporate",
    allowed: ["Corporate dashboard, programs, projects, funding, employees, evidence, reports, and settings", "Program-scoped evidence and export records", "Public supporter journeys when needed"],
    restricted: "No platform admin or partner portal access by default.",
    icon: Building2
  },
  {
    role: "Partner",
    label: "Conservation operator",
    purpose: "Maintain field updates, campaign activity, expeditions, and evidence submissions for assigned organizations.",
    entry: "/partner",
    allowed: ["Partner overview, campaign activity, evidence submission, updates, and expedition operations", "Activity timelines and verification status", "Public pages for checking published output"],
    restricted: "Cannot access admin pages or corporate workspace by default.",
    icon: Sprout
  },
  {
    role: "Admin",
    label: "Platform operator",
    purpose: "Run the platform, verify evidence, manage content, reconcile payments, inspect reports, and review audit logs.",
    entry: "/admin",
    allowed: ["Admin dashboard, campaigns, expeditions, partners, impact sites, evidence, reports, users, Academy, corporate setup, and audit", "Partner portal inspection for operational support", "Own supporter dashboard"],
    restricted: "Corporate workspace data is available only when the admin also has corporate program permission.",
    icon: ShieldCheck
  }
];

const enforcement = [
  {
    title: "Session identity",
    body: "Authenticated routes read the secure Terumbu session cookie, then load the current user and profile basics before rendering protected content.",
    icon: LockKeyhole
  },
  {
    title: "Role lookup",
    body: "Global roles are stored as named role records and many-to-many user role assignments. Guards compare the user role keys to the allowed role list.",
    icon: BadgeCheck
  },
  {
    title: "Corporate permission layer",
    body: "Corporate access can be granted by role or by account-scoped corporate permission, which lets program users enter /corporate without becoming platform admins.",
    icon: Building2
  },
  {
    title: "Redirect behavior",
    body: "Guests are sent to /login with a safe next path. Signed-in users without the required role are sent back to their best allowed workspace.",
    icon: ArrowRight
  }
];

const accessRows = [
  ["/, /campaigns, /expeditions, /academy, /impact-map", "Allow", "Allow", "Allow", "Allow", "Allow"],
  ["/checkout/donation, /checkout/expedition", "Allow", "Allow", "Allow", "Allow", "Allow"],
  ["/dashboard/*", "Login", "Allow", "Allow own", "Allow own", "Allow own"],
  ["/dashboard/passport", "Login", "Own passport", "Own passport", "Own passport", "Own passport"],
  ["/corporate/*", "Login", "No program", "Allow", "No program", "Only if granted"],
  ["/partner", "Login", "Forbidden", "Forbidden", "Allow", "Allow"],
  ["/admin/*", "Login", "Forbidden", "Forbidden", "Forbidden", "Allow"]
];

const faqs = [
  {
    question: "What is Terumbu.eco?",
    answer:
      "Terumbu.eco is a conservation engagement platform for Indonesia coastal ecosystems. It connects fundraising, expeditions, Academy learning, verified impact tracking, partner operations, and corporate reporting in one application."
  },
  {
    question: "How does the platform keep impact claims trustworthy?",
    answer:
      "Campaigns are connected to partner organizations, impact sites, updates, and project evidence. Partner submissions move through an admin verification workflow before they become stronger public trust signals, and operational changes can be audited."
  },
  {
    question: "What happens after someone donates?",
    answer:
      "The donation is stored with donor details, amount, currency, campaign, payment status, receipt data, and transaction references. Successful donations update campaign totals and can create user dashboard and Impact Passport milestones."
  },
  {
    question: "How are expeditions different from donations?",
    answer:
      "Expeditions are travel and field-participation products with departures, capacity, participant records, booking payments, and preparation details. They can still connect to conservation campaigns and impact allocations."
  },
  {
    question: "How does Academy connect to the Impact Passport?",
    answer:
      "Academy stores enrollments, lesson progress, assessment attempts, and certificates. When a learner earns a certificate, it can appear in certificates and become an Impact Passport milestone."
  },
  {
    question: "How is corporate funding handled?",
    answer:
      "Corporate support is modeled through corporate accounts, programs, project portfolios, contribution ledger rows, evidence centers, employees, governance settings, and report exports. It stays separate from individual donation records."
  },
  {
    question: "Who can submit and verify evidence?",
    answer:
      "Partners submit activity and evidence for their conservation work. Admins review the submitted evidence and mark it verified or rejected. Verified evidence can support public campaign pages and corporate reporting."
  },
  {
    question: "What public data is exposed?",
    answer:
      "Public pages show campaign, partner, expedition, Academy, impact-map, public corporate impact, and public or link-visible passport information. Private dashboard data, private passport content, session-only data, and admin controls stay protected."
  }
];

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white/78 ring-1 ring-white/18">{children}</span>;
}

export default function PlatformPage() {
  return (
    <>
      <section className="bg-ocean-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            <Pill>Fundraising</Pill>
            <Pill>Field evidence</Pill>
            <Pill>Academy</Pill>
            <Pill>Impact Passport</Pill>
            <Pill>Corporate ESG</Pill>
          </div>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Platform guide</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-normal sm:text-6xl">
            How Terumbu.eco connects funding, fieldwork, learning, and verified impact.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/76">
            Terumbu.eco is built as a shared operating layer for public supporters, conservation partners, corporate ESG teams, and platform administrators. Each workflow feeds the next record of trust instead of living in a separate tool.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#workflows">
              View Workflows
              <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="#rbac" tone="light">
              Review RBAC
            </ButtonLink>
            <ButtonLink href="#faq" tone="ghost" className="border border-white/24 text-white hover:bg-white/10">
              FAQ
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {platformHighlights.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-white">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-base font-bold tracking-normal text-ocean-900">{item.label}</h2>
                <p className="mt-2 text-sm leading-6 text-ocean-900/66">{item.value}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflows" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Workflows" title="How the main journeys move across the platform">
          The platform is organized around linked records: discovery pages create intent, checkout or workspace actions create durable records, and dashboards turn those records into impact history.
        </SectionHeading>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {workflows.map((workflow) => {
            const Icon = workflow.icon;

            return (
              <article key={workflow.title} className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold tracking-normal text-ocean-900">{workflow.title}</h2>
                    <p className="mt-2 text-sm font-semibold text-coral-700">{workflow.routes}</p>
                    <p className="mt-3 text-sm leading-6 text-ocean-900/68">{workflow.summary}</p>
                  </div>
                </div>
                <ol className="mt-6 space-y-3">
                  {workflow.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-6 text-ocean-900/72">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ocean-50 text-xs font-black text-ocean-700">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 rounded-xl bg-ocean-50 p-4 text-sm font-semibold leading-6 text-ocean-900">{workflow.outcome}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="rbac" className="bg-ocean-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="RBAC" title="Role-based access keeps public trust and private operations separate">
            Terumbu.eco uses account sessions, named roles, route guards, and corporate permission records to send every user to the right workspace while blocking unrelated workflows.
          </SectionHeading>

          <div className="mt-10 grid gap-5 lg:grid-cols-5">
            {roles.map((role) => {
              const Icon = role.icon;

              return (
                <article key={role.role} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-sm">
                  <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-white">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{role.label}</p>
                  <h2 className="mt-2 text-lg font-bold tracking-normal text-ocean-900">{role.role}</h2>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/66">{role.purpose}</p>
                  <p className="mt-4 text-sm font-bold text-ocean-900">Entry: {role.entry}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-ocean-900/70">
                    {role.allowed.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 size={16} className="mt-1 shrink-0 text-kelp-500" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm leading-6 text-ocean-900/62">
                    <span className="font-bold text-ocean-900">Restriction:</span> {role.restricted}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-normal text-ocean-900">How access is enforced</h2>
              <div className="mt-5 grid gap-4">
                {enforcement.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article key={item.title} className="rounded-2xl border border-ocean-900/10 bg-white p-5">
                      <div className="flex gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                          <Icon size={19} aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-bold text-ocean-900">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-ocean-900/66">{item.body}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft">
              <div className="border-b border-ocean-900/10 p-5">
                <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Access matrix</h2>
                <p className="mt-2 text-sm leading-6 text-ocean-900/66">Expected behavior for the core route groups across each role.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] text-left text-sm">
                  <thead className="bg-ocean-900 text-white">
                    <tr>
                      {["Path group", "Guest", "User", "Corporate", "Partner", "Admin"].map((heading) => (
                        <th key={heading} className="px-4 py-3 font-bold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ocean-900/10">
                    {accessRows.map((row) => (
                      <tr key={row[0]} className="align-top">
                        {row.map((cell, index) => (
                          <td key={`${row[0]}-${cell}-${index}`} className="px-4 py-3 text-ocean-900/72">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading eyebrow="Data relationships" title="The platform is designed around traceable records">
            Public trust depends on knowing which action created which record. Terumbu links funding, learning, travel, evidence, and reporting back to campaigns, sites, partners, users, or corporate programs.
          </SectionHeading>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Campaign records", "Goals, raised amounts, donors, field updates, impact sites, partner verification, and evidence."],
              ["User records", "Sessions, profile, donations, corals, bookings, lesson progress, certificates, and passport visibility."],
              ["Partner records", "Organization profile, member access, campaign activity, updates, evidence submissions, and verification status."],
              ["Corporate records", "Accounts, programs, budgets, employees, project portfolios, contribution ledgers, evidence center, and report exports."]
            ].map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-kelp-100 text-kelp-700">
                    <FileText size={18} aria-hidden="true" />
                  </span>
                  <h2 className="font-bold text-ocean-900">{title}</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-ocean-900/66">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Common platform questions" />
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.question} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-6">
                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-coral-700">
                    <HelpCircle size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold tracking-normal text-ocean-900">{item.question}</h2>
                    <p className="mt-3 text-sm leading-6 text-ocean-900/68">{item.answer}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ocean-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Next step</p>
            <h2 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">Explore the live conservation surface.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              Start from public campaigns and follow the evidence, updates, partners, and impact records behind each conservation claim.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/campaigns">
              View Campaigns
              <CircleDollarSign size={18} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/impact-map" tone="light">
              Open Impact Map
              <MapPinned size={18} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/dashboard/passport" tone="ghost" className="border border-white/24 text-white hover:bg-white/10">
              Impact Passport
              <FileBadge size={18} aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
