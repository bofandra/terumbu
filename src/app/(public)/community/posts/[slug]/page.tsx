import { MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { CommunityAuthorBadge, CommunityCommentForm, CommunityCommentThread, CommunityImage, CommunityTargetActions } from "@/components/community-ui";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getCommunityPostDetail } from "@/lib/community-queries";

export const dynamic = "force-dynamic";

type CommunityPostPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "long" }) : "Published";
}

export async function generateMetadata({ params }: CommunityPostPageProps) {
  const { slug } = await params;
  const data = await getCommunityPostDetail(slug);

  return {
    title: data ? data.post.title : "Community Post"
  };
}

export default async function CommunityPostPage({ params }: CommunityPostPageProps) {
  const [{ slug }, user] = await Promise.all([params, getSessionUser()]);
  const data = await getCommunityPostDetail(slug, user?.id);

  if (!data) {
    notFound();
  }

  const next = `/community/posts/${data.post.slug}`;

  return (
    <main className="bg-sand-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <ButtonLink href="/community" tone="ghost" className="px-0 hover:bg-transparent hover:text-coral-700">
            Community
          </ButtonLink>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-coral-100 px-3 py-1 text-xs font-bold uppercase text-coral-700">{data.post.postType}</span>
            {data.post.chapter ? <span className="text-xs font-bold text-ocean-900/54">{data.post.chapter.name}</span> : null}
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{data.post.title}</h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <CommunityAuthorBadge author={data.post.author} detail={formatDate(data.post.publishedAt ?? data.post.createdAt)} />
            <span className="inline-flex items-center gap-2 text-sm font-bold text-ocean-900/58">
              <MessageCircle size={17} aria-hidden="true" />
              {data.post.commentCount} comments
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {data.post.mediaUrl ? <CommunityImage src={data.post.mediaUrl} alt={data.post.title} className="aspect-[16/9] w-full rounded-lg object-cover shadow-soft" /> : null}
        <article className="rounded-lg border border-ocean-900/10 bg-white p-5 text-base leading-8 text-ocean-900/76 shadow-soft">
          {data.post.body.split(/\n+/).map((paragraph) => (
            <p key={paragraph} className="mb-4 last:mb-0">{paragraph}</p>
          ))}
        </article>

        <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Discussion</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.post.reactionCount} reactions</h2>
            </div>
            <CommunityTargetActions targetType="post" targetId={data.post.id} next={next} reactionType={data.reactionType} />
          </div>
          <div className="mt-5">
            <CommunityCommentForm targetType="post" targetId={data.post.id} next={next} />
          </div>
          <div className="mt-5">
            {data.comments.length > 0 ? (
              <CommunityCommentThread comments={data.comments} targetType="post" targetId={data.post.id} next={next} />
            ) : (
              <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">No comments yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
