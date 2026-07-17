import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  Download,
  FileBadge,
  FileText,
  GraduationCap,
  Languages,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import {
  completeLessonAction,
  enrollCourseAction,
  removeSavedCourseAction,
  saveCourseAction,
  submitAssessmentAction
} from "@/lib/academy-actions";
import { getSessionUser } from "@/lib/auth";
import { getCourseDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

function ProgressBar({ value, label }: { value: number; label: string }) {
  return <ProgressMeter value={value} label={label} indicatorClassName="bg-kelp-500" trackClassName="bg-ocean-900/10" />;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function formatAttemptDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const course = await getCourseDetail(slug, user?.id);

  if (!course) {
    notFound();
  }

  const canSubmitAssessment = Boolean(course.enrollment && course.progressPercent >= 100 && !course.certificate);
  const isEnrolled = Boolean(course.enrollment);
  const certificateIssued = course.certificate?.issuedAt ? formatDate(course.certificate.issuedAt) : null;
  const SaveIcon = course.isSaved ? BookmarkCheck : Bookmark;
  const assessmentQuestions = course.assessment?.questions ?? [];
  const hasAssessmentQuestions = assessmentQuestions.length > 0;
  const attemptFailed = course.attempt?.status === "failed";
  const attemptPassed = course.attempt?.status === "passed";

  return (
    <>
      <section className="relative overflow-hidden bg-ocean-900 text-white">
        {course.imageUrl ? <Image src={course.imageUrl} alt="" fill priority className="object-cover opacity-[0.38]" sizes="100vw" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,52,63,0.98),rgba(7,52,63,0.82),rgba(7,52,63,0.38))]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-20">
          <div>
            <Link href="/academy" className="inline-flex items-center gap-2 text-sm font-bold text-white/76 hover:text-white">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to Academy
            </Link>
            <p className="mt-8 text-sm font-bold uppercase text-coral-200">{course.topic}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">{course.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/76">{course.summary}</p>
            <div className="mt-7 flex flex-wrap gap-2 text-sm font-bold text-white/80">
              <span className="rounded-full bg-white/12 px-4 py-2">{course.level}</span>
              <span className="rounded-full bg-white/12 px-4 py-2">{course.duration}</span>
              <span className="rounded-full bg-white/12 px-4 py-2">{course.moduleLabel}</span>
              <span className="rounded-full bg-white/12 px-4 py-2">{course.language}</span>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isEnrolled ? (
                <ButtonLink href="#course-outline">
                  <PlayCircle size={18} aria-hidden="true" />
                  Continue Course
                </ButtonLink>
              ) : user ? (
                <form action={enrollCourseAction}>
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  <Button type="submit">
                    <BookOpen size={18} aria-hidden="true" />
                    Enroll
                  </Button>
                </form>
              ) : (
                <ButtonLink href={`/login?next=/academy/courses/${course.slug}`}>
                  <BookOpen size={18} aria-hidden="true" />
                  Login to Enroll
                </ButtonLink>
              )}
              <ButtonLink href="#certificate" tone="light">
                <Award size={18} aria-hidden="true" />
                Certificate Details
              </ButtonLink>
              {user ? (
                <form action={course.isSaved ? removeSavedCourseAction : saveCourseAction}>
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  <input type="hidden" name="next" value={`/academy/courses/${course.slug}`} />
                  <Button type="submit" tone="light">
                    <SaveIcon size={18} aria-hidden="true" />
                    {course.isSaved ? "Saved" : "Save Course"}
                  </Button>
                </form>
              ) : (
                <ButtonLink href={`/login?next=${encodeURIComponent(`/academy/courses/${course.slug}`)}`} tone="light">
                  <Bookmark size={18} aria-hidden="true" />
                  Save Course
                </ButtonLink>
              )}
            </div>
          </div>

          <article className="self-end rounded-2xl border border-white/18 bg-white p-5 text-ocean-900 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-coral-700">{isEnrolled ? "Enrollment active" : course.accessLabel}</p>
                <h2 className="mt-2 text-2xl font-bold">{isEnrolled ? `${course.progressPercent}% complete` : "Start this learning track"}</h2>
              </div>
              <ShieldCheck size={28} aria-hidden="true" className="text-kelp-500" />
            </div>
            <p className="mt-3 text-sm leading-6 text-ocean-900/62">
              {course.certificate
                ? `Certificate ${course.certificate.certificateNumber} issued on ${certificateIssued}.`
                : "Complete every lesson and pass the final check to add this course to your learning record."}
            </p>
            <div className="mt-5">
              <ProgressBar value={course.progressPercent} label={`${course.title} progress`} />
              <p className="mt-2 text-xs font-bold text-ocean-900/56">
                {course.completedLessons}/{course.lessonCount} modules completed
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ocean-50 p-3">
                <Clock size={18} aria-hidden="true" className="text-coral-500" />
                <p className="mt-2 font-bold">{course.remainingMinutes} min</p>
                <p className="text-xs text-ocean-900/54">Remaining</p>
              </div>
              <div className="rounded-xl bg-ocean-50 p-3">
                <FileBadge size={18} aria-hidden="true" className="text-coral-500" />
                <p className="mt-2 font-bold">{course.certificateHours} hours</p>
                <p className="text-xs text-ocean-900/54">Credential record</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-8">
          <section id="course-outline">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase text-coral-700">Course outline</p>
                <h2 className="mt-2 text-3xl font-bold text-ocean-900">Lessons and progress</h2>
              </div>
              <p className="text-sm font-semibold text-ocean-900/58">{course.instructor} - {course.instructorRole}</p>
            </div>
            <div className="mt-6 grid gap-4">
              {course.lessons.map((lesson) => {
                const completed = lesson.progress?.status === "completed";

                return (
                  <article key={lesson.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                      <div className="flex gap-4">
                        <div
                          className={cn(
                            "grid size-12 flex-none place-items-center rounded-full",
                            completed ? "bg-kelp-100 text-kelp-700" : isEnrolled ? "bg-coral-100 text-coral-700" : "bg-ocean-50 text-ocean-900/42"
                          )}
                        >
                          {completed ? <CheckCircle2 size={22} aria-hidden="true" /> : isEnrolled ? <PlayCircle size={22} aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ocean-900/52">
                            Lesson {lesson.position} - {lesson.durationMinutes} min
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-ocean-900">{lesson.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-ocean-900/64">{lesson.body}</p>
                        </div>
                      </div>
                      {completed ? (
                        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-kelp-100 px-4 text-sm font-bold text-kelp-700">
                          <CheckCircle2 size={17} aria-hidden="true" />
                          Completed
                        </span>
                      ) : isEnrolled ? (
                        <form action={completeLessonAction}>
                          <input type="hidden" name="courseSlug" value={course.slug} />
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <Button type="submit" tone="secondary">
                            <PlayCircle size={18} aria-hidden="true" />
                            Complete
                          </Button>
                        </form>
                      ) : (
                        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900/56">
                          <Circle size={17} aria-hidden="true" />
                          Locked
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="final-assessment" className="scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-bold uppercase text-coral-700">Final assessment</p>
                <h2 className="mt-2 text-2xl font-bold text-ocean-900">{course.assessment?.title ?? "Final course check"}</h2>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">
                  Passing score: {course.assessment?.passingScore ?? 80}. Current attempt: {course.attempt?.status ?? "not submitted"}.
                </p>
              </div>
              {course.certificate ? (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kelp-100 px-5 text-sm font-bold text-kelp-700">
                  <FileBadge size={17} aria-hidden="true" />
                  Certified
                </span>
              ) : attemptFailed ? (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-coral-100 px-5 text-sm font-bold text-coral-700">
                  <RotateCcw size={17} aria-hidden="true" />
                  Retake available
                </span>
              ) : isEnrolled ? (
                <span className="rounded-full bg-ocean-50 px-5 py-3 text-sm font-bold text-ocean-900/58">
                  {canSubmitAssessment ? "Ready to submit" : "Complete all lessons to unlock"}
                </span>
              ) : (
                <ButtonLink href={`/login?next=/academy/courses/${course.slug}`} tone="secondary">Enroll to Start</ButtonLink>
              )}
            </div>

            {course.attempt ? (
              <div className={cn("mt-5 rounded-xl border p-4", attemptPassed ? "border-kelp-200 bg-kelp-100/40" : "border-coral-200 bg-coral-100/40")}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className={cn("text-sm font-bold", attemptPassed ? "text-kelp-700" : "text-coral-700")}>
                      Latest score: {course.attempt.score}%
                    </p>
                    <p className="mt-1 text-sm text-ocean-900/62">
                      Attempt {course.attempt.attemptCount || 1} submitted {formatAttemptDate(course.attempt.submittedAt)}.
                    </p>
                  </div>
                  {attemptPassed ? (
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-kelp-700">
                      <CheckCircle2 size={18} aria-hidden="true" />
                      Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-coral-700">
                      <XCircle size={18} aria-hidden="true" />
                      Try again
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {canSubmitAssessment ? (
              hasAssessmentQuestions ? (
                <form action={submitAssessmentAction} className="mt-6 grid gap-4">
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  {assessmentQuestions.map((question) => (
                    <fieldset key={question.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                      <legend className="px-1 text-sm font-bold text-ocean-900">
                        Question {question.position} · {question.points} point{question.points === 1 ? "" : "s"}
                      </legend>
                      <p className="mt-2 text-base font-bold text-ocean-900">{question.text}</p>
                      <div className="mt-4 grid gap-2">
                        {question.choices.map((choice) => (
                          <label
                            key={choice.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 text-sm font-semibold text-ocean-900 transition hover:border-coral-300",
                              choice.isSelected && choice.isCorrect && "border-kelp-300 bg-kelp-100/50",
                              choice.isSelected && !choice.isCorrect && course.attempt && "border-coral-300 bg-coral-100/40",
                              !choice.isSelected && choice.isCorrect && course.attempt && "border-kelp-300 bg-kelp-100/35",
                              !choice.isSelected && !choice.isCorrect && "border-ocean-900/10"
                            )}
                          >
                            <input
                              type="radio"
                              name={`question_${question.id}`}
                              value={choice.id}
                              required
                              defaultChecked={choice.isSelected}
                              className="mt-1 size-4 accent-coral-500"
                            />
                            <span className="leading-6">{choice.text}</span>
                          </label>
                        ))}
                      </div>
                      {course.attempt ? (
                        <div className="mt-3 text-sm font-semibold">
                          {question.wasCorrect ? (
                            <p className="inline-flex items-center gap-2 text-kelp-700">
                              <CheckCircle2 size={16} aria-hidden="true" />
                              Previous answer was correct.
                            </p>
                          ) : (
                            <p className="text-coral-700">
                              Previous answer: {question.selectedChoiceText ?? "not answered"}. Correct answer: {question.correctChoiceText ?? "not recorded"}.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </fieldset>
                  ))}
                  <div className="flex flex-col justify-between gap-3 rounded-xl bg-ocean-50 p-4 sm:flex-row sm:items-center">
                    <p className="text-sm font-semibold text-ocean-900/62">
                      {attemptFailed ? "Retake the check when you are ready. Your latest attempt will update this feedback." : "Submit once all questions are answered."}
                    </p>
                    <Button type="submit">
                      {attemptFailed ? <RotateCcw size={18} aria-hidden="true" /> : <ClipboardCheck size={18} aria-hidden="true" />}
                      {attemptFailed ? "Retake Final Check" : "Submit Final Check"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form action={submitAssessmentAction} className="mt-5">
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  <input type="hidden" name="score" value={course.assessment?.passingScore ?? 80} />
                  <Button type="submit">
                    <ClipboardCheck size={18} aria-hidden="true" />
                    Submit Final Check
                  </Button>
                </form>
              )
            ) : course.attempt && hasAssessmentQuestions ? (
              <div className="mt-5 grid gap-3">
                {assessmentQuestions.map((question) => (
                  <div key={question.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                    <p className="text-sm font-bold text-ocean-900">
                      Question {question.position}: {question.text}
                    </p>
                    <p className={cn("mt-2 text-sm font-semibold", question.wasCorrect ? "text-kelp-700" : "text-coral-700")}>
                      {question.wasCorrect
                        ? `Correct: ${question.selectedChoiceText}`
                        : `Your answer: ${question.selectedChoiceText ?? "not answered"}. Correct answer: ${question.correctChoiceText ?? "not recorded"}.`}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase text-coral-700">Course facts</p>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                { label: "Instructor", value: course.instructor, icon: GraduationCap },
                { label: "Partner", value: course.partner, icon: ShieldCheck },
                { label: "Format", value: course.format, icon: PlayCircle },
                { label: "Language", value: course.language, icon: Languages },
                { label: "Access", value: course.accessLabel, icon: Award }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl bg-ocean-50 p-3">
                    <Icon size={18} aria-hidden="true" className="text-coral-500" />
                    <div>
                      <dt className="text-xs font-bold text-ocean-900/50">{item.label}</dt>
                      <dd className="font-bold text-ocean-900">{item.value}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase text-coral-700">Completion requirements</p>
            <ul className="mt-4 grid gap-3 text-sm font-semibold text-ocean-900/68">
              {["Complete all required lessons", "Pass the final course check", "Keep certificate details verifiable", "Apply learning responsibly in field contexts"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={17} aria-hidden="true" className="mt-0.5 text-kelp-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article id="certificate" className="rounded-2xl border border-credential-300/70 bg-credential-50 p-5 shadow-soft">
            <p className="text-sm font-bold uppercase text-credential-700">Certificate</p>
            <div className="mt-4 grid min-h-32 place-items-center rounded-xl border border-credential-300 bg-white p-4 text-center">
              <FileBadge size={36} aria-hidden="true" className="text-credential-700" />
              <p className="mt-3 text-sm font-bold text-ocean-900">{course.certificateOutcome}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-ocean-900/62">
              Certificates verify course completion, learning hours, and assessment result. They do not imply professional licensing.
            </p>
            {course.certificate ? (
              <ButtonLink href="/dashboard/certificates" tone="secondary" className="mt-4 w-full">
                <FileBadge size={18} aria-hidden="true" />
                View Certificate
              </ButtonLink>
            ) : null}
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase text-coral-700">Learning resources</p>
            <div className="mt-4 grid gap-3">
              {[
                { label: "Field checklist", icon: FileText },
                { label: "Glossary", icon: BookOpen },
                { label: "Monitoring template", icon: Download }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl bg-sand-50 p-3 text-sm font-bold text-ocean-900">
                    <Icon size={17} aria-hidden="true" className="text-coral-500" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase text-coral-700">Apply this knowledge</p>
            <h2 className="mt-2 text-xl font-bold text-ocean-900">Connect learning to conservation action</h2>
            <p className="mt-3 text-sm leading-6 text-ocean-900/62">
              Use this course before supporting campaigns, joining field activities, or explaining verified outcomes in your Impact Passport.
            </p>
            <div className="mt-4 grid gap-2">
              <Link href="/campaigns" className="inline-flex min-h-10 items-center justify-between rounded-xl bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                Explore campaigns
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/expeditions" className="inline-flex min-h-10 items-center justify-between rounded-xl bg-ocean-50 px-4 text-sm font-bold text-ocean-900">
                Explore expeditions
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
