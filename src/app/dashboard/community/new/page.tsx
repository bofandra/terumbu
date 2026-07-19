import { CalendarDays, HeartHandshake, MessageCircle } from "lucide-react";
import Link from "next/link";

import { CommunityComposer, type CommunityComposerMode } from "@/components/community-ui";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getCommunityChapters } from "@/lib/community-queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Create Community"
};

export const dynamic = "force-dynamic";

type DashboardCommunityCreatePageProps = {
  searchParams?: Promise<{
    type?: string;
    error?: string;
  }>;
};

const tabs: Array<{ mode: CommunityComposerMode; label: string; href: string; icon: typeof MessageCircle }> = [
  { mode: "post", label: "Post", href: "/dashboard/community/new?type=post", icon: MessageCircle },
  { mode: "event", label: "Event", href: "/dashboard/community/new?type=event", icon: CalendarDays },
  { mode: "challenge", label: "Challenge", href: "/dashboard/community/new?type=challenge", icon: HeartHandshake }
];

const errorMessages: Record<string, string> = {
  "post-invalid": "Enter a post title and body.",
  "event-invalid": "Enter event title, timing, location, summary, and description.",
  "challenge-invalid": "Enter challenge title, summary, description, and valid dates.",
  "image-type": "Upload a PNG, JPEG, WebP, or GIF image.",
  "image-size": "Upload an image under the current size limit."
};

function normalizeCreateMode(value: string | undefined): CommunityComposerMode {
  return value === "event" || value === "challenge" ? value : "post";
}

export default async function DashboardCommunityCreatePage({ searchParams }: DashboardCommunityCreatePageProps) {
  const [params, user] = await Promise.all([searchParams, requireUser("/dashboard/community/new")]);
  const mode = normalizeCreateMode(params?.type);
  const chapters = await getCommunityChapters(user.id, 100);
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Create Community</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Publish from your dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Choose one content type, complete the form, and it will appear in the public community after publishing.
          </p>
        </div>
        <ButtonLink href="/dashboard/community" tone="secondary">
          My Community
        </ButtonLink>
      </header>

      {errorMessage ? <p className="mt-6 rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Community publish type">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.mode === mode;

          return (
            <Link
              key={tab.mode}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition",
                active ? "border-coral-500 bg-coral-500 text-white shadow-soft" : "border-ocean-900/10 bg-white text-ocean-900 hover:border-coral-500"
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-6">
        <CommunityComposer chapters={chapters} mode={mode} />
      </section>
    </main>
  );
}
