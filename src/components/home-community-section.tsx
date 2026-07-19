import { BookOpen, Mail, MapPinned, Quote, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

const stories = [
  {
    quote: "I planted 25 corals in Wakatobi and could see the record in my passport the same week.",
    name: "Sarah",
    detail: "Expedition participant"
  },
  {
    quote: "Our coastal cleanup became evidence that students, parents, and donors could all follow.",
    name: "Komodo Ocean Watch",
    detail: "Community partner"
  },
  {
    quote: "The map helped our team explain exactly where our CSR funding went and what changed.",
    name: "Dimas",
    detail: "Corporate supporter"
  }
];

const communityActions = [
  {
    title: "Volunteer in the field",
    description: "Join coastal planting days, cleanup teams, reef surveys, and community learning activities.",
    icon: Users,
    href: "/expeditions"
  },
  {
    title: "Prepare with Academy",
    description: "Learn the basics before joining field teams or supporting a restoration campaign.",
    icon: BookOpen,
    href: "/academy"
  },
  {
    title: "Follow verified updates",
    description: "Track evidence, campaign milestones, and expedition records as partner reports arrive.",
    icon: MapPinned,
    href: "/impact-map"
  }
];

export function HomeCommunitySection() {
  return (
    <section id="community" className="bg-white py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Community stories</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">
            Real people turn conservation into records others can trust
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-1">
            {stories.map((story) => (
              <article key={story.name} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5 shadow-sm">
                <Quote className="text-coral-500" size={22} aria-hidden="true" />
                <p className="mt-4 text-base leading-7 text-ocean-900">{story.quote}</p>
                <p className="mt-5 text-sm font-bold text-ocean-900">{story.name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-ocean-900/48">{story.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-5">
          <div className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
            <Mail className="text-coral-300" size={24} aria-hidden="true" />
            <h3 className="mt-5 text-2xl font-bold tracking-normal">Join the community</h3>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Follow stories, publish local events, join regional chapters, and complete conservation challenges with other Ocean Heroes.
            </p>
            <ButtonLink href="/community" tone="light" className="mt-6">
              Open Community
            </ButtonLink>
          </div>

          {communityActions.map((action) => {
            const Icon = action.icon;

            return (
              <article key={action.title} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                <Icon className="text-coral-500" size={22} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold tracking-normal text-ocean-900">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ocean-900/64">{action.description}</p>
                <ButtonLink href={action.href} tone="ghost" className="mt-4 px-0 hover:bg-transparent hover:text-coral-700">
                  Open path
                </ButtonLink>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
