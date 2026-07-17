import {
  ArrowRight,
  Award,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  FileBadge,
  Filter,
  GraduationCap,
  Languages,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { removeSavedCourseAction, saveCourseAction } from "@/lib/academy-actions";
import { getSessionUser } from "@/lib/auth";
import { getAcademyHomeData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Academy"
};

export const dynamic = "force-dynamic";

type AcademyHomeData = Awaited<ReturnType<typeof getAcademyHomeData>>;
type AcademyCourse = AcademyHomeData["courses"][number];
type AcademySearchParams = { q?: string; topic?: string; level?: string };

const journey = [
  { title: "Learn", body: "Build practical conservation knowledge.", icon: BookOpen },
  { title: "Practice", body: "Complete lessons and final checks.", icon: CheckCircle2 },
  { title: "Participate", body: "Join projects, events, or expeditions.", icon: Users },
  { title: "Record", body: "Add achievements to your Impact Passport.", icon: FileBadge },
  { title: "Lead", body: "Use your learning to guide better action.", icon: Sparkles }
];

const footerTrust = [
  { label: "Self-paced learning", support: "Learn anywhere", icon: Clock },
  { label: "Selected free courses", support: "Start without payment", icon: BookOpen },
  { label: "Verified certificates", support: "Added to your profile", icon: ShieldCheck },
  { label: "Multiple languages", support: "Bahasa and English", icon: Languages },
  { label: "Field-connected curriculum", support: "Real conservation context", icon: Users }
];

function displayNameFor(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return user?.displayName ?? user?.name ?? "Ocean learner";
}

function courseMatches(course: AcademyCourse, query: string, topic: string, level: string) {
  const haystack = [course.title, course.summary, course.topic, course.instructor, course.level, course.format]
    .join(" ")
    .toLowerCase();
  const matchesQuery = query ? haystack.includes(query.toLowerCase()) : true;
  const matchesTopic = topic ? course.topic.toLowerCase().includes(topic.toLowerCase()) : true;
  const matchesLevel = level ? course.level.toLowerCase() === level.toLowerCase() : true;

  return matchesQuery && matchesTopic && matchesLevel;
}

function ProgressBar({ value, label, tone = "bg-coral-500" }: { value: number; label: string; tone?: string }) {
  return <ProgressMeter value={value} label={label} indicatorClassName={tone} trackClassName="bg-ocean-900/10" />;
}

function CourseSaveControl({
  course,
  isAuthenticated,
  next = "/academy"
}: {
  course: AcademyCourse;
  isAuthenticated: boolean;
  next?: string;
}) {
  const Icon = course.isSaved ? BookmarkCheck : Bookmark;
  const label = course.isSaved ? "Saved" : "Save";

  if (!isAuthenticated) {
    return (
      <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} tone="ghost" className="min-h-10 border border-ocean-900/10 px-4">
        <Bookmark size={16} aria-hidden="true" />
        Save
      </ButtonLink>
    );
  }

  return (
    <form action={course.isSaved ? removeSavedCourseAction : saveCourseAction}>
      <input type="hidden" name="courseSlug" value={course.slug} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" tone={course.isSaved ? "secondary" : "ghost"} className="min-h-10 border border-ocean-900/10 px-4">
        <Icon size={16} aria-hidden="true" />
        {label}
      </Button>
    </form>
  );
}

function CourseCard({ course, isAuthenticated }: { course: AcademyCourse; isAuthenticated: boolean }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft">
      <Link href={`/academy/courses/${course.slug}`} className="relative block aspect-[16/9] bg-ocean-900">
        {course.imageUrl ? <Image src={course.imageUrl} alt={`${course.title} course`} fill className="object-cover" sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw" /> : null}
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">{course.badge}</span>
      </Link>
      <div className="p-5">
        <p className="text-xs font-bold uppercase text-coral-700">{course.topic}</p>
        <h3 className="mt-2 min-h-14 text-lg font-bold leading-7 text-ocean-900">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ocean-900/62">{course.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-ocean-900/62">
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap size={15} aria-hidden="true" />
            {course.level}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} aria-hidden="true" />
            {course.duration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={15} aria-hidden="true" />
            {course.moduleLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award size={15} aria-hidden="true" />
            {course.priceLabel}
          </span>
        </div>
        {course.enrollment ? (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-ocean-900/62">
              <span>{course.progressPercent}% complete</span>
              <span>{course.completedLessons}/{course.lessonCount} modules</span>
            </div>
            <ProgressBar value={course.progressPercent} label={`${course.title} progress`} tone="bg-kelp-500" />
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ocean-900/56">{course.learnerLabel}</span>
          <div className="flex flex-wrap items-center gap-2">
            <CourseSaveControl course={course} isAuthenticated={isAuthenticated} />
            <Link href={`/academy/courses/${course.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700">
              {course.enrollment ? "Continue" : "View Course"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function AcademyPage({
  searchParams
}: {
  searchParams?: Promise<AcademySearchParams>;
}) {
  const userPromise = getSessionUser();
  const params = (await searchParams) ?? {};
  const user = await userPromise;
  const data = await getAcademyHomeData(user?.id);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const topic = typeof params.topic === "string" ? params.topic.trim() : "";
  const level = typeof params.level === "string" ? params.level.trim() : "";
  const filteredCourses = data.courses.filter((course) => courseMatches(course, query, topic, level));
  const firstCourseHref = data.courses[0] ? `/academy/courses/${data.courses[0].slug}` : "/academy";
  const heroCourse = data.featuredCourse ?? data.courses[0] ?? null;
  const isAuthenticated = Boolean(user);

  return (
    <>
      <section className="relative min-h-[620px] overflow-hidden bg-ocean-900 text-white">
        {data.heroImageUrl ? (
          <Image src={data.heroImageUrl} alt="" fill priority className="object-cover opacity-[0.42]" sizes="100vw" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,52,63,0.96),rgba(7,52,63,0.76),rgba(7,52,63,0.28))]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase text-coral-200">Terumbu Academy</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">
              Learn Today. Protect the Ocean Tomorrow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Build practical conservation knowledge, prepare for field activities, and earn verified credentials connected to your Impact Passport.
            </p>

            <form action="/academy" className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl bg-white p-2 shadow-soft sm:flex-row">
              <label className="flex min-h-12 flex-1 items-center gap-3 px-3 text-ocean-900">
                <Search size={20} aria-hidden="true" className="text-ocean-900/50" />
                <span className="sr-only">Search Academy courses</span>
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="What would you like to learn?"
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ocean-900/44"
                />
              </label>
              <Button type="submit" className="sm:min-w-36">
                <Search size={17} aria-hidden="true" />
                Search
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/78">
              <span className="font-bold text-white">Popular:</span>
              {data.popularTopics.map((item) => (
                <Link key={item} href={`/academy?topic=${encodeURIComponent(item)}`} className="rounded-full border border-white/20 px-3 py-1 font-semibold text-white/82 hover:bg-white/10">
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#course-catalog">
                <BookOpen size={18} aria-hidden="true" />
                Explore Courses
              </ButtonLink>
              <ButtonLink href="#learning-tracks" tone="light">
                <GraduationCap size={18} aria-hidden="true" />
                View Learning Tracks
              </ButtonLink>
              {user ? (
                <ButtonLink href="/dashboard/academy" tone="ghost" className="bg-white/10 text-white hover:bg-white/18">
                  <PlayCircle size={18} aria-hidden="true" />
                  My Learning
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 self-end lg:pl-8">
            {heroCourse ? (
              <article className="overflow-hidden rounded-2xl border border-white/18 bg-white/12 shadow-soft backdrop-blur">
                <div className="relative aspect-[16/9] bg-ocean-900">
                  {heroCourse.imageUrl ? <Image src={heroCourse.imageUrl} alt={`${heroCourse.title} preview`} fill className="object-cover" sizes="(min-width: 1024px) 460px, 100vw" /> : null}
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-16 place-items-center rounded-full bg-white/92 text-ocean-900 shadow-soft">
                      <PlayCircle size={34} aria-hidden="true" />
                    </span>
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-sm font-bold text-coral-100">{heroCourse.topic}</p>
                  <h2 className="mt-2 text-2xl font-bold">{heroCourse.title}</h2>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/78">
                    <span className="rounded-full bg-white/12 px-3 py-1">{heroCourse.duration}</span>
                    <span className="rounded-full bg-white/12 px-3 py-1">{heroCourse.moduleLabel}</span>
                    <span className="rounded-full bg-white/12 px-3 py-1">{heroCourse.certificateOutcome}</span>
                  </div>
                </div>
              </article>
            ) : null}

            <div className="rounded-2xl border border-white/18 bg-white p-5 text-ocean-900 shadow-soft">
              <p className="text-sm font-bold">Welcome back, {displayNameFor(user)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "In progress", value: data.learnerSummary.inProgressCourses, icon: BookOpen },
                  { label: "Completed", value: data.learnerSummary.completedCourses, icon: CheckCircle2 },
                  { label: "Certificates", value: data.learnerSummary.certificatesEarned, icon: FileBadge },
                  { label: "Hours", value: data.learnerSummary.learningHours, icon: Clock }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div key={stat.label} className="rounded-xl border border-ocean-900/10 bg-ocean-50 p-3 text-center">
                      <Icon size={18} aria-hidden="true" className="mx-auto text-coral-500" />
                      <p className="mt-2 text-2xl font-bold">{stat.value.toLocaleString("id-ID")}</p>
                      <p className="text-xs font-semibold text-ocean-900/54">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-ocean-900/62">
                  <span>Ocean Hero progress</span>
                  <span>{data.learnerSummary.trackProgress}%</span>
                </div>
                <ProgressBar value={data.learnerSummary.trackProgress} label="Ocean Hero progress" tone="bg-ocean-500" />
                <p className="mt-3 text-sm leading-6 text-ocean-900/62">{data.learnerSummary.nextMilestone}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-6 lg:px-8">
          {data.trustStats.map((stat) => (
            <div key={stat.label} className="flex min-h-16 items-center gap-3 border-ocean-900/10 lg:border-r lg:last:border-r-0">
              <ShieldCheck size={22} aria-hidden="true" className="text-ocean-500" />
              <div>
                <p className="text-2xl font-bold text-ocean-900">{stat.value}</p>
                <p className="text-xs font-semibold text-ocean-900/56">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="grid gap-6">
          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Continue learning</p>
              <h2 className="mt-2 text-3xl font-bold text-ocean-900">{data.continueLearning ? data.continueLearning.title : "Start your first conservation course"}</h2>
            </div>
            <Link href="/dashboard/academy" className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
              View My Learning
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </header>

          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <article className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft">
              <div className="relative aspect-[16/9] bg-ocean-900">
                {(data.continueLearning?.imageUrl ?? data.featuredCourse?.imageUrl) ? (
                  <Image
                    src={(data.continueLearning?.imageUrl ?? data.featuredCourse?.imageUrl) as string}
                    alt={`${data.continueLearning?.title ?? data.featuredCourse?.title ?? "Academy course"} image`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 520px, 100vw"
                  />
                ) : null}
              </div>
              <div className="p-6">
                <p className="text-sm font-bold text-coral-700">{data.continueLearning?.topic ?? data.featuredCourse?.topic ?? "Academy"}</p>
                <h3 className="mt-2 text-2xl font-bold text-ocean-900">{data.continueLearning?.title ?? data.featuredCourse?.title ?? "Browse Academy courses"}</h3>
                <p className="mt-3 text-sm leading-6 text-ocean-900/62">
                  {data.continueLearning
                    ? `Module ${Math.max(1, data.continueLearning.completedLessons + 1)} of ${Math.max(1, data.continueLearning.lessonCount)}. ${data.continueLearning.remainingMinutes} minutes remaining.`
                    : "Choose a beginner course or follow a learning track to start recording progress."}
                </p>
                <div className="mt-5">
                  <ProgressBar value={data.continueLearning?.progressPercent ?? 0} label="Continue learning progress" tone="bg-kelp-500" />
                  <p className="mt-2 text-xs font-bold text-ocean-900/56">
                    {data.continueLearning ? `${data.continueLearning.progressPercent}% complete` : "Certificate eligible courses available"}
                  </p>
                </div>
                <ButtonLink href={data.continueLearning ? `/academy/courses/${data.continueLearning.slug}` : firstCourseHref} className="mt-6">
                  <PlayCircle size={18} aria-hidden="true" />
                  {data.continueLearning ? "Continue Course" : "Start Learning"}
                </ButtonLink>
              </div>
            </article>

            <div className="grid gap-4">
              {[...data.activeCourses, ...data.recommendedCourses].slice(0, 3).map((course) => (
                <Link key={course.slug} href={`/academy/courses/${course.slug}`} className="grid grid-cols-[96px_1fr] gap-4 rounded-2xl border border-ocean-900/10 bg-white p-3 shadow-soft transition hover:-translate-y-0.5">
                  <span className="relative overflow-hidden rounded-xl bg-ocean-900">
                    {course.imageUrl ? <Image src={course.imageUrl} alt="" fill className="object-cover" sizes="96px" /> : null}
                  </span>
                  <span className="min-w-0 py-1">
                    <span className="block text-sm font-bold text-ocean-900">{course.title}</span>
                    <span className="mt-1 block text-xs font-semibold text-ocean-900/54">{course.topic}</span>
                    <span className="mt-3 block">
                      <ProgressBar value={course.progressPercent} label={`${course.title} progress`} tone="bg-ocean-500" />
                    </span>
                    <span className="mt-2 block text-xs font-bold text-ocean-900/56">{course.progressPercent}% complete</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <article className="rounded-2xl border border-coral-300/40 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="relative h-24 w-28 flex-none overflow-hidden rounded-xl bg-ocean-900">
                {data.preparation.imageUrl ? <Image src={data.preparation.imageUrl} alt="" fill className="object-cover" sizes="112px" /> : null}
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-coral-700">Prepare for your expedition</p>
                <h2 className="mt-1 text-lg font-bold text-ocean-900">{data.preparation.title}</h2>
                <p className="mt-1 text-sm text-ocean-900/58">{data.preparation.subtitle}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-ocean-900/62">
                <span>{data.preparation.complete} of {data.preparation.total} modules completed</span>
                <span>{data.preparation.progressPercent}%</span>
              </div>
              <ProgressBar value={data.preparation.progressPercent} label="Expedition preparation progress" tone="bg-coral-500" />
            </div>
            <ul className="mt-4 grid gap-2">
              {data.preparation.modules.slice(0, 4).map((module) => (
                <li key={module.label} className="flex items-center gap-2 text-sm font-semibold text-ocean-900/68">
                  <CheckCircle2 size={17} aria-hidden="true" className={module.complete ? "text-kelp-500" : "text-ocean-900/30"} />
                  {module.label}
                </li>
              ))}
            </ul>
            <ButtonLink href={data.preparation.href} tone="secondary" className="mt-5 w-full">
              Continue Preparation
            </ButtonLink>
          </article>

          <article id="live-learning" className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-coral-700">Live classes and webinars</p>
                <h2 className="mt-2 text-xl font-bold text-ocean-900">{data.liveSession.title}</h2>
              </div>
              <div className="rounded-xl border border-ocean-900/10 bg-ocean-50 px-4 py-3 text-center">
                <p className="text-xl font-bold text-ocean-900">{data.liveSession.dateLabel.split(" ")[0]}</p>
                <p className="text-xs font-bold text-ocean-900/54">{data.liveSession.dateLabel.split(" ")[1]}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-ocean-900/62">
              With {data.liveSession.speaker} - {data.liveSession.timeLabel} - {data.liveSession.format}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/60">
              <span className="rounded-full bg-ocean-50 px-3 py-1">{data.liveSession.language}</span>
              <span className="rounded-full bg-kelp-100 px-3 py-1 text-kelp-700">{data.liveSession.capacityLabel}</span>
            </div>
            <ButtonLink href={data.liveSession.href} tone="ghost" className="mt-5 border border-ocean-900/10">
              Register Free
            </ButtonLink>
          </article>

          <article className="rounded-2xl border border-credential-300/60 bg-credential-50 p-5 shadow-soft">
            <p className="text-sm font-bold uppercase text-credential-700">Your certificates</p>
            <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
              <div className="grid min-h-24 place-items-center rounded-xl border border-credential-300 bg-white p-3 text-center">
                <FileBadge size={32} aria-hidden="true" className="text-credential-700" />
                <p className="mt-2 text-xs font-bold text-ocean-900">Terumbu Academy</p>
              </div>
              <div>
                <h2 className="font-bold text-ocean-900">{data.certificatePreview.title}</h2>
                <p className="mt-2 text-sm text-ocean-900/62">Credential ID: {data.certificatePreview.credentialId}</p>
                <p className="mt-1 text-sm text-ocean-900/62">{data.certificatePreview.issuedLabel}</p>
                <Link href={data.certificatePreview.href} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-credential-700">
                  {data.certificatePreview.verified ? "View certificate" : "View example"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="learning-tracks" className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-coral-700">Learning tracks</p>
              <h2 className="mt-2 text-3xl font-bold text-ocean-900">Choose your learning journey</h2>
            </div>
            <Link href="#course-catalog" className="inline-flex items-center gap-2 text-sm font-bold text-coral-700">
              View all courses
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {data.tracks.map((track) => (
              <article
                key={track.slug}
                className={cn(
                  "rounded-2xl border p-6 shadow-soft",
                  track.tone === "ocean" && "border-ocean-100 bg-ocean-50",
                  track.tone === "kelp" && "border-kelp-100 bg-kelp-100/60",
                  track.tone === "navy" && "border-ocean-900 bg-ocean-900 text-white"
                )}
              >
                <GraduationCap size={28} aria-hidden="true" className={track.tone === "navy" ? "text-coral-200" : "text-coral-500"} />
                <p className={cn("mt-5 text-sm font-bold", track.tone === "navy" ? "text-white/66" : "text-ocean-900/56")}>{track.level}</p>
                <h3 className="mt-2 text-2xl font-bold">{track.title}</h3>
                <p className={cn("mt-3 text-sm leading-6", track.tone === "navy" ? "text-white/70" : "text-ocean-900/64")}>{track.purpose}</p>
                <div className={cn("mt-5 flex flex-wrap gap-2 text-xs font-bold", track.tone === "navy" ? "text-white/72" : "text-ocean-900/62")}>
                  <span className={cn("rounded-full px-3 py-1", track.tone === "navy" ? "bg-white/12" : "bg-white")}>{track.totalCourses} course</span>
                  <span className={cn("rounded-full px-3 py-1", track.tone === "navy" ? "bg-white/12" : "bg-white")}>{track.duration}</span>
                  <span className={cn("rounded-full px-3 py-1", track.tone === "navy" ? "bg-white/12" : "bg-white")}>{track.outcome}</span>
                </div>
                <div className="mt-6">
                  <div className={cn("mb-2 flex justify-between text-xs font-bold", track.tone === "navy" ? "text-white/70" : "text-ocean-900/62")}>
                    <span>{track.completedCourses}/{track.totalCourses} completed</span>
                    <span>{track.progressPercent}%</span>
                  </div>
                  <ProgressBar value={track.progressPercent} label={`${track.title} progress`} tone={track.tone === "navy" ? "bg-coral-300" : "bg-ocean-500"} />
                </div>
                <Link href={track.href} className={cn("mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold", track.tone === "navy" ? "bg-white text-ocean-900" : "bg-ocean-900 text-white")}>
                  {track.progressPercent > 0 ? "Continue Track" : "Start Track"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="course-catalog" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-coral-700">Course catalog</p>
            <h2 className="mt-2 text-3xl font-bold text-ocean-900">Explore all courses</h2>
          </div>
          <form action="/academy" className="grid gap-3 rounded-2xl border border-ocean-900/10 bg-white p-3 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-ocean-50 px-3">
              <Search size={17} aria-hidden="true" className="text-ocean-900/48" />
              <span className="sr-only">Search courses</span>
              <input name="q" defaultValue={query} placeholder="Search courses" className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-ocean-900/42" />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-ocean-50 px-3 text-sm font-semibold text-ocean-900">
              <Filter size={17} aria-hidden="true" />
              <span className="sr-only">Topic</span>
              <select name="topic" defaultValue={topic} className="w-full bg-transparent outline-none">
                <option value="">All topics</option>
                {data.popularTopics.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl bg-ocean-50 px-3 text-sm font-semibold text-ocean-900">
              <GraduationCap size={17} aria-hidden="true" />
              <span className="sr-only">Difficulty</span>
              <select name="level" defaultValue={level} className="w-full bg-transparent outline-none">
                <option value="">All levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Professional">Professional</option>
              </select>
            </label>
            <Button type="submit">Apply</Button>
          </form>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.slug} course={course} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-ocean-900/20 bg-white p-8 text-center shadow-soft">
            <Search size={30} aria-hidden="true" className="mx-auto text-ocean-900/40" />
            <h3 className="mt-4 text-xl font-bold text-ocean-900">No courses found</h3>
            <p className="mt-2 text-sm text-ocean-900/60">Try a broader topic or browse the full catalog.</p>
            <ButtonLink href="/academy" tone="secondary" className="mt-5">Reset Filters</ButtonLink>
          </div>
        )}
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-coral-700">Learning to action</p>
            <h2 className="mt-2 text-3xl font-bold text-ocean-900">Turn learning into real impact</h2>
            <p className="mt-4 text-base leading-7 text-ocean-900/62">
              Academy progress connects with campaigns, expeditions, certificates, and the Impact Passport so learning becomes part of a measurable conservation journey.
            </p>
            <ButtonLink href="/dashboard/passport" tone="secondary" className="mt-6">
              <FileBadge size={18} aria-hidden="true" />
              View Impact Passport
            </ButtonLink>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {journey.map((step) => {
              const Icon = step.icon;

              return (
                <article key={step.title} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
                  <Icon size={22} aria-hidden="true" className="text-coral-500" />
                  <h3 className="mt-4 font-bold text-ocean-900">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-ocean-900/58">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-coral-700">Instructors</p>
            <h2 className="mt-2 text-3xl font-bold text-ocean-900">Learn from conservation practitioners</h2>
          </div>
          <Link href="/about" className="inline-flex items-center gap-2 text-sm font-bold text-coral-700">
            View partners
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {data.instructors.map((instructor) => (
            <article key={instructor.name} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="grid size-14 place-items-center rounded-full bg-ocean-900 text-lg font-bold text-white">
                  {instructor.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
                </div>
                <div>
                  <h3 className="font-bold text-ocean-900">{instructor.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/54">{instructor.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ocean-900/62">{instructor.expertise}</p>
              <div className="mt-4 flex items-center justify-between text-xs font-bold text-ocean-900/56">
                <span>{instructor.organization}</span>
                <span>{instructor.courseCount} courses</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ocean-900 py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.7fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-coral-200">Start building your conservation knowledge</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight">Learn at your own pace and turn progress into action.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
              Complete lessons, earn verified credentials, and connect what you learn to conservation projects and field experiences.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={firstCourseHref}>
                <BookOpen size={18} aria-hidden="true" />
                Explore Free Courses
              </ButtonLink>
              <ButtonLink href="#learning-tracks" tone="light">
                <GraduationCap size={18} aria-hidden="true" />
                View Learning Tracks
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-3">
            {footerTrust.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 p-4">
                  <Icon size={22} aria-hidden="true" className="text-coral-200" />
                  <div>
                    <p className="font-bold">{item.label}</p>
                    <p className="text-sm text-white/58">{item.support}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
