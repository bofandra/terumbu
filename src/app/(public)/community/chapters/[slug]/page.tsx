import { notFound } from "next/navigation";

import {
  CommunityChallengeCardView,
  CommunityChapterCardView,
  CommunityEmptyState,
  CommunityEventCardView,
  CommunityImage,
  CommunityPostCardView
} from "@/components/community-ui";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getCommunityChapterDetail } from "@/lib/community-queries";

export const dynamic = "force-dynamic";

type CommunityChapterPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CommunityChapterPageProps) {
  const { slug } = await params;
  const data = await getCommunityChapterDetail(slug);

  return {
    title: data ? data.chapter.name : "Community Chapter"
  };
}

export default async function CommunityChapterPage({ params }: CommunityChapterPageProps) {
  const [{ slug }, user] = await Promise.all([params, getSessionUser()]);
  const data = await getCommunityChapterDetail(slug, user?.id);

  if (!data) {
    notFound();
  }

  const next = `/community/chapters/${data.chapter.slug}`;

  return (
    <main className="bg-sand-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.38fr] lg:px-8">
          <div>
            <ButtonLink href="/community#chapters" tone="ghost" className="px-0 hover:bg-transparent hover:text-coral-700">
              Community chapters
            </ButtonLink>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{data.chapter.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ocean-900/68">{data.chapter.description}</p>
            <p className="mt-4 text-sm font-bold text-ocean-900/58">{data.chapter.region}</p>
          </div>
          <CommunityChapterCardView chapter={data.chapter} next={next} />
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {data.chapter.imageUrl ? <CommunityImage src={data.chapter.imageUrl} alt={data.chapter.name} className="aspect-[21/9] w-full rounded-lg object-cover shadow-soft" /> : null}

        <section>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Posts</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Chapter feed</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.posts.length > 0 ? data.posts.map((post) => <CommunityPostCardView key={post.id} post={post} />) : <CommunityEmptyState title="No chapter posts" description="Posts linked to this chapter will appear here." />}
          </div>
        </section>

        <section>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Events</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Chapter events</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.events.length > 0 ? data.events.map((event) => <CommunityEventCardView key={event.id} event={event} next={next} />) : <CommunityEmptyState title="No chapter events" description="Events linked to this chapter will appear here." />}
          </div>
        </section>

        <section>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Challenges</p>
          <h2 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Chapter challenges</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.challenges.length > 0 ? data.challenges.map((challenge) => <CommunityChallengeCardView key={challenge.id} challenge={challenge} next={next} />) : <CommunityEmptyState title="No chapter challenges" description="Challenges linked to this chapter will appear here." />}
          </div>
        </section>
      </div>
    </main>
  );
}
