import Link from "next/link";
import { ArrowUpRight, BarChart3, BookOpenCheck, CheckCircle2, Circle, ClipboardCheck, FileQuestion, Percent, ListPlus, Save, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import {
  createAcademyAssessmentAction,
  createAcademyLessonAction,
  createAcademyQuestionAction,
  updateAcademyCourseAction
} from "@/lib/academy-actions";
import { requireRole } from "@/lib/auth";
import { getAdminAcademyCourse } from "@/lib/queries";

export const metadata = {
  title: "Manage Academy Course"
};

export const dynamic = "force-dynamic";

const courseStatuses = ["draft", "published", "archived"];
const choiceLabels = ["A", "B", "C", "D"];

const savedMessages: Record<string, string> = {
  assessment: "Assessment saved.",
  course: "Course saved.",
  lesson: "Lesson saved.",
  question: "Question saved."
};

const errorMessages: Record<string, string> = {
  assessment: "Choose a course and enter assessment details.",
  course: "Enter a title and summary for the course.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  lesson: "Choose a course and enter a lesson title.",
  question: "Enter a question, at least two choices, and a non-empty correct answer."
};

type AdminAcademyCoursePageProps = {
  params: Promise<{
    courseId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function CourseStatusSelect({ defaultValue = "draft" }: { defaultValue?: string }) {
  return (
    <select name="status" defaultValue={defaultValue} className={adminSelectClassName}>
      {courseStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Not published";
}

function formatAttemptDate(value: Date | null) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "No attempts yet";
}

function choiceLabelFor(position: number) {
  return choiceLabels[position - 1] ?? position.toLocaleString("id-ID");
}

function AssessmentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-ocean-900/10 pl-3">
      <p className="text-xs font-bold uppercase text-ocean-900/48">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-normal text-ocean-900">{value}</p>
    </div>
  );
}

function QuestionBuilder({
  courseId,
  assessmentId,
  nextPosition
}: {
  courseId: string;
  assessmentId: string;
  nextPosition: number;
}) {
  return (
    <form action={createAcademyQuestionAction} className="border-t border-ocean-900/10 bg-white p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h4 className="text-lg font-bold tracking-normal text-ocean-900">Question builder</h4>
        <span className="inline-flex min-h-8 w-fit items-center rounded-lg bg-ocean-50 px-3 text-xs font-bold uppercase text-ocean-900/58">
          Position {nextPosition.toLocaleString("id-ID")}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_140px_120px]">
        <Field label="Question prompt" className="lg:row-span-2">
          <textarea
            name="questionText"
            className={`${adminTextareaClassName} min-h-36`}
            placeholder="What should learners know after this course?"
            required
          />
        </Field>
        <Field label="Position">
          <input name="position" type="number" min={1} defaultValue={nextPosition} className={adminInputClassName} required />
        </Field>
        <Field label="Points">
          <input name="points" type="number" min={1} defaultValue={1} className={adminInputClassName} required />
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-ocean-900">Answer choices</legend>
        <div className="mt-3 grid gap-3">
          {choiceLabels.map((label, index) => (
            <div key={label} className="grid gap-2 rounded-lg border border-ocean-900/10 bg-sand-50 p-3 md:grid-cols-[128px_minmax(0,1fr)] md:items-center">
              <label className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-ocean-900 ring-1 ring-ocean-900/10">
                <input
                  name="correctChoiceIndex"
                  type="radio"
                  value={index}
                  defaultChecked={index === 0}
                  className="size-4 accent-coral-500"
                  aria-label={`Mark answer ${label} as correct`}
                />
                <span className="grid size-7 place-items-center rounded-md bg-ocean-50 text-xs">{label}</span>
                Correct
              </label>
              <input
                name="choiceText"
                className={adminInputClassName}
                placeholder={index < 2 ? `Answer ${label}` : `Optional answer ${label}`}
                required={index < 2}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <Button type="submit" className="mt-4 rounded-lg">
        <ListPlus className="size-4" aria-hidden="true" />
        Add Question
      </Button>
    </form>
  );
}

export default async function AdminAcademyCoursePage({ params, searchParams }: AdminAcademyCoursePageProps) {
  const { courseId } = await params;
  await requireRole(["admin"], `/admin/academy/courses/${courseId}`);
  const query = await searchParams;
  const course = await getAdminAcademyCourse(courseId);

  if (!course) {
    notFound();
  }

  const savedMessage = query?.saved ? savedMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;
  const questionCount = course.assessments.reduce((total, assessment) => total + assessment.questions.length, 0);
  const nextLessonPosition = course.lessons.length + 1;
  const latestAttempt = course.analytics.latestAttempt;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Academy"
        title={course.title}
        description={`${course.level} / ${course.duration} / ${labelize(course.status)}`}
        actionHref="/admin/academy"
        actionLabel="Academy list"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Course summary">
        {[
          { label: "Status", value: labelize(course.status), icon: ClipboardCheck },
          { label: "Lessons", value: course.lessons.length.toLocaleString("id-ID"), icon: BookOpenCheck },
          { label: "Assessments", value: course.assessments.length.toLocaleString("id-ID"), icon: FileQuestion },
          { label: "Questions", value: questionCount.toLocaleString("id-ID"), icon: ListPlus },
          { label: "Attempts", value: course.analytics.totalSubmissions.toLocaleString("id-ID"), icon: BarChart3 },
          { label: "Pass rate", value: `${course.analytics.passRate}%`, icon: Percent }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold capitalize tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={`${adminPanelClassName} p-4`}>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
              <TrendingUp className="size-5 text-coral-700" aria-hidden="true" />
              Assessment analytics
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {course.analytics.latestAttemptCount.toLocaleString("id-ID")} learners attempted, {course.analytics.totalSubmissions.toLocaleString("id-ID")} total submissions, {course.analytics.averageScore}% average score.
            </p>
          </div>
          {latestAttempt ? (
            <div className="rounded-lg border border-ocean-900/10 bg-sand-50 px-4 py-3 text-sm font-semibold text-ocean-900">
              Latest: {latestAttempt.learnerName ?? latestAttempt.learnerEmail ?? "Learner"} scored {latestAttempt.score}% ({latestAttempt.status}) on {formatAttemptDate(latestAttempt.submittedAt)}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-ocean-900/16 bg-sand-50 px-4 py-3 text-sm font-semibold text-ocean-900/58">
              No assessment attempts yet.
            </div>
          )}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Course details</h2>
              <AdminStatusBadge value={course.status} />
            </div>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Published at: {formatDate(course.publishedAt)}</p>
          </div>
          {course.status === "published" ? (
            <Link href={`/academy/courses/${course.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
              Public page
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <form action={updateAcademyCourseAction} className="grid gap-4 p-4">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Title" className="lg:col-span-2">
              <input name="title" defaultValue={course.title} className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" defaultValue={course.slug} className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Level">
              <input name="level" defaultValue={course.level} className={adminInputClassName} required />
            </Field>
            <Field label="Duration minutes">
              <input name="durationMinutes" type="number" min={1} defaultValue={course.durationMinutes} className={adminInputClassName} required />
            </Field>
            <Field label="Status">
              <CourseStatusSelect defaultValue={course.status} />
            </Field>
          </div>
          <Field label="Replace image">
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
          </Field>
          <Field label="Summary">
            <textarea name="summary" defaultValue={course.summary} className={adminTextareaClassName} required />
          </Field>
          <Field label="Description">
            <textarea name="description" defaultValue={course.description ?? ""} className={adminTextareaClassName} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Save className="size-4" aria-hidden="true" />
            Save Course
          </Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Lessons</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Build the course sequence learners complete before assessment.</p>
          </div>
          <BookOpenCheck className="size-5 text-kelp-700" aria-hidden="true" />
        </div>

        <div className="grid gap-4 p-4">
          {course.lessons.map((lesson) => (
            <article key={lesson.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ocean-900">{lesson.position}. {lesson.title}</h3>
                    {lesson.isPreview ? <AdminStatusBadge value="preview" /> : null}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    /{lesson.slug} / {lesson.durationMinutes.toLocaleString("id-ID")} minutes
                  </p>
                  {lesson.body ? <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-ocean-900/62">{lesson.body}</p> : null}
                </div>
              </div>
            </article>
          ))}

          {course.lessons.length === 0 ? (
            <AdminEmptyState
              title="No lessons yet"
              description="Add the first lesson so learners have a sequence to complete."
            />
          ) : null}

          <form action={createAcademyLessonAction} className="rounded-lg border border-ocean-900/10 bg-white p-4">
            <input type="hidden" name="courseId" value={course.id} />
            <h3 className="text-lg font-bold tracking-normal text-ocean-900">Add lesson</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              <Field label="Title" className="lg:col-span-2">
                <input name="title" className={adminInputClassName} required />
              </Field>
              <Field label="Slug">
                <input name="slug" className={adminInputClassName} />
              </Field>
              <Field label="Position">
                <input name="position" type="number" min={1} defaultValue={nextLessonPosition} className={adminInputClassName} required />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[180px_1fr]">
              <Field label="Duration minutes">
                <input name="durationMinutes" type="number" min={1} defaultValue={15} className={adminInputClassName} required />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm font-bold text-ocean-900">
                <input name="isPreview" type="checkbox" className="size-4 rounded border-ocean-900/20 text-coral-500" />
                Preview lesson
              </label>
            </div>
            <Field label="Body" className="mt-3">
              <textarea name="body" className={adminTextareaClassName} placeholder="Lesson content or facilitator notes" />
            </Field>
            <Button type="submit" className="mt-4 rounded-lg">
              <ListPlus className="size-4" aria-hidden="true" />
              Add Lesson
            </Button>
          </form>
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Assessments</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Maintain certificate checks and question choices.</p>
          </div>
          <FileQuestion className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="grid gap-4 p-4">
          {course.assessments.map((assessment) => {
            const assessmentLatestAttempt = assessment.analytics.latestAttempt;
            const topMissedQuestions = assessment.analytics.questionStats.filter((stat) => stat.answeredCount > 0).slice(0, 3);

            return (
              <article key={assessment.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white">
                <div className="border-b border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <h3 className="text-lg font-bold tracking-normal text-ocean-900">{assessment.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                        /{assessment.slug} / {assessment.passingScore}% passing score / {assessment.questions.length.toLocaleString("id-ID")} questions
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px] lg:grid-cols-4">
                      <AssessmentMetric label="Attempts" value={assessment.analytics.totalSubmissions.toLocaleString("id-ID")} />
                      <AssessmentMetric label="Pass rate" value={`${assessment.analytics.passRate}%`} />
                      <AssessmentMetric label="Average" value={`${assessment.analytics.averageScore}%`} />
                      <AssessmentMetric
                        label="Latest"
                        value={assessmentLatestAttempt ? `${assessmentLatestAttempt.score}% ${labelize(assessmentLatestAttempt.status)}` : "None"}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="p-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <h4 className="font-bold text-ocean-900">Question bank</h4>
                      <span className="inline-flex min-h-8 w-fit items-center rounded-lg bg-ocean-50 px-3 text-xs font-bold uppercase text-ocean-900/58">
                        {assessment.questions.length.toLocaleString("id-ID")} total
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {assessment.questions.map((question) => {
                        const questionStat = assessment.analytics.questionStats.find((stat) => stat.questionId === question.id);

                        return (
                          <article key={question.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white">
                            <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 bg-ocean-50/70 p-3 sm:flex-row sm:items-start">
                              <div className="flex gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold text-ocean-900 ring-1 ring-ocean-900/10">
                                  Q{question.position}
                                </span>
                                <div>
                                  <p className="font-bold leading-6 text-ocean-900">{question.questionText}</p>
                                  <p className="mt-1 text-xs font-bold uppercase text-ocean-900/48">
                                    {question.points} points / {questionStat?.missRate ?? 0}% miss rate
                                  </p>
                                </div>
                              </div>
                              <AdminStatusBadge value={question.status} />
                            </div>
                            <ol className="grid gap-2 p-3">
                              {question.choices.map((choice) => (
                                <li
                                  key={choice.id}
                                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
                                    choice.isCorrect
                                      ? "border-kelp-700/20 bg-kelp-100/60 text-kelp-700"
                                      : "border-ocean-900/10 bg-white text-ocean-900/68"
                                  }`}
                                >
                                  {choice.isCorrect ? (
                                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                  ) : (
                                    <Circle className="mt-0.5 size-4 shrink-0 text-ocean-900/36" aria-hidden="true" />
                                  )}
                                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white text-xs font-bold text-ocean-900 ring-1 ring-ocean-900/10">
                                    {choiceLabelFor(choice.position)}
                                  </span>
                                  <span className="min-w-0 flex-1 leading-6">{choice.choiceText}</span>
                                  {choice.isCorrect ? <span className="shrink-0 text-xs font-bold uppercase">Correct</span> : null}
                                </li>
                              ))}
                            </ol>
                            {questionStat && questionStat.answeredCount > 0 ? (
                              <div className="border-t border-ocean-900/10 px-3 py-2 text-xs font-bold uppercase text-coral-700">
                                {questionStat.missedCount.toLocaleString("id-ID")} missed / {questionStat.answeredCount.toLocaleString("id-ID")} answered
                              </div>
                            ) : null}
                          </article>
                        );
                      })}

                      {assessment.questions.length === 0 ? (
                        <AdminEmptyState
                          title="No questions yet"
                          description="Create the first scored question for this assessment."
                          className="bg-white"
                        />
                      ) : null}
                    </div>
                  </div>

                  <aside className="border-t border-ocean-900/10 bg-sand-50/70 p-4 lg:border-l lg:border-t-0">
                    <h4 className="font-bold text-ocean-900">Assessment pulse</h4>
                    {assessmentLatestAttempt ? (
                      <div className="mt-3 rounded-lg border border-ocean-900/10 bg-white p-3 text-sm font-semibold leading-6 text-ocean-900/64">
                        Latest attempt by {assessmentLatestAttempt.learnerName ?? assessmentLatestAttempt.learnerEmail ?? "Learner"} on {formatAttemptDate(assessmentLatestAttempt.submittedAt)} after {assessmentLatestAttempt.attemptCount.toLocaleString("id-ID")} attempt(s).
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-ocean-900/16 bg-white p-3 text-sm font-semibold text-ocean-900/58">
                        No attempts yet.
                      </div>
                    )}

                    {topMissedQuestions.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase text-ocean-900/48">Question focus</p>
                        <div className="mt-3 grid gap-3">
                          {topMissedQuestions.map((stat) => (
                            <div key={stat.questionId}>
                              <div className="flex flex-col justify-between gap-1 text-sm font-semibold text-ocean-900/62 sm:flex-row lg:flex-col">
                                <span className="line-clamp-2">{stat.position}. {stat.questionText}</span>
                                <span className="shrink-0 font-bold text-ocean-900">{stat.missRate}% missed</span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-coral-500" style={{ width: `${stat.missRate}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </aside>
                </div>

                <QuestionBuilder courseId={course.id} assessmentId={assessment.id} nextPosition={assessment.questions.length + 1} />
              </article>
            );
          })}

          {course.assessments.length === 0 ? (
            <AdminEmptyState
              title="No assessments yet"
              description="Create an assessment so learners can complete the course and earn certificates."
            />
          ) : null}

          <form action={createAcademyAssessmentAction} className="rounded-lg border border-ocean-900/10 bg-white p-4">
            <input type="hidden" name="courseId" value={course.id} />
            <h3 className="text-lg font-bold tracking-normal text-ocean-900">Add assessment</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_160px]">
              <Field label="Title">
                <input name="title" defaultValue="Final assessment" className={adminInputClassName} required />
              </Field>
              <Field label="Slug">
                <input name="slug" defaultValue="final-assessment" className={adminInputClassName} />
              </Field>
              <Field label="Passing score">
                <input name="passingScore" type="number" min={1} max={100} defaultValue={70} className={adminInputClassName} required />
              </Field>
            </div>
            <Button type="submit" className="mt-4 rounded-lg">
              <ListPlus className="size-4" aria-hidden="true" />
              Add Assessment
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
