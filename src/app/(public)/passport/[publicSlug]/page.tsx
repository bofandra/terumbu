import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PassportPreview } from "@/components/passport-preview";
import { SectionHeading } from "@/components/section-heading";
import { getPublicPassport } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const passport = await getPublicPassport(publicSlug);

  return {
    title: passport ? `${passport.displayName} Impact Passport` : "Impact Passport"
  };
}

export default async function PublicPassportPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const passport = await getPublicPassport(publicSlug);

  if (!passport) {
    notFound();
  }

  return (
    <main>
      <section className="bg-ocean-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Public Impact Passport</p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">{passport.displayName}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/74">{passport.story ?? passport.bio}</p>
          <p className="mt-4 text-sm font-semibold text-white/62">{passport.location}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <PassportPreview passport={passport.preview} />
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Verified timeline">
            Public passport items show donations, sponsored ecosystems, expeditions, and certificates with evidence links.
          </SectionHeading>
          <div className="mt-8 grid gap-4">
            {passport.items.map((item) => (
              <article key={`${item.itemType}-${item.title}`} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
                  {item.itemType} · {item.occurredAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ocean-900/68">{item.description}</p>
                {item.evidenceUrl ? (
                  <Link href={item.evidenceUrl} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-coral-700">
                    Evidence
                    <ExternalLink size={15} aria-hidden="true" />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
