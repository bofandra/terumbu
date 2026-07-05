import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, CheckCircle2, ClipboardCheck, FileQuestion, ListPlus, Save } from "lucide-react";
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

const savedMessages: Record<string, string> = {
  assessment: "Assessment saved.",
  course: "Course saved.",
  lesson: "Lesson saved.",
  question: "Question saved."
};

const errorMessages: Record<string, string> = {
  assessment: "Choose a course and enter assessment details.",
  course: "Enter a title and summary for the course.",
  lesson: "Choose a course and enter a lesson title.",
  question: "Enter a question with at least two choices."
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

      <section className="grid gap-3 md:grid-cols-5" aria-label="Course summary">
        {[
          { label: "Status", value: labelize(course.status), icon: ClipboardCheck },
          { label: "Lessons", value: course.lessons.length.toLocaleString("id-ID"), icon: BookOpenCheck },
          { label: "Assessments", value: course.assessments.length.toLocaleString("id-ID"), icon: FileQuestion },
          { label: "Questions", value: questionCount.toLocaleString("id-ID"), icon: ListPlus },
          { label: "Certificates", value: course.certificateCount.toLocaleString("id-ID"), icon: CheckCircle2 }
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
          <Field label="Image URL">
            <input name="imageUrl" type="url" defaultValue={course.imageUrl ?? ""} className={adminInputClassName} />
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
          {course.assessments.map((assessment) => (
            <article key={assessment.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-bold text-ocean-900">{assessment.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    /{assessment.slug} / {assessment.passingScore}% passing score / {assessment.questions.length.toLocaleString("id-ID")} questions
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {assessment.questions.map((question) => (
                  <div key={question.id} className="rounded-lg border border-ocean-900/10 bg-white p-3">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-bold text-ocean-900">{question.position}. {question.questionText}</p>
                        <p className="mt-1 text-xs font-bold uppercase text-ocean-900/48">{question.points} points / {question.status}</p>
                      </div>
                      <AdminStatusBadge value={question.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.choices.map((choice) => (
                        <span key={choice.id} className={`rounded-full px-3 py-1 text-xs font-bold ${choice.isCorrect ? "bg-kelp-100 text-kelp-700" : "bg-ocean-50 text-ocean-700"}`}>
                          {choice.position}. {choice.choiceText}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {assessment.questions.length === 0 ? (
                  <AdminEmptyState
                    title="No questions yet"
                    description="Add assessment questions with answer choices before relying on this assessment for certification."
                  />
                ) : null}
              </div>

              <form action={createAcademyQuestionAction} className="mt-4 rounded-lg border border-ocean-900/10 bg-white p-4">
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="assessmentId" value={assessment.id} />
                <h4 className="font-bold text-ocean-900">Add question</h4>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_120px_120px]">
                  <Field label="Question" className="lg:row-span-2">
                    <textarea name="questionText" className={adminTextareaClassName} required />
                  </Field>
                  <Field label="Position">
                    <input name="position" type="number" min={1} defaultValue={assessment.questions.length + 1} className={adminInputClassName} required />
                  </Field>
                  <Field label="Points">
                    <input name="points" type="number" min={1} defaultValue={1} className={adminInputClassName} required />
                  </Field>
                  <Field label="Correct choice" className="lg:col-span-2">
                    <select name="correctChoiceIndex" defaultValue="0" className={adminSelectClassName}>
                      <option value="0">Choice 1</option>
                      <option value="1">Choice 2</option>
                      <option value="2">Choice 3</option>
                      <option value="3">Choice 4</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((choice) => (
                    <Field key={choice} label={`Choice ${choice}`}>
                      <input name="choiceText" className={adminInputClassName} required />
                    </Field>
                  ))}
                </div>
                <Button type="submit" className="mt-4 rounded-lg">
                  <ListPlus className="size-4" aria-hidden="true" />
                  Add Question
                </Button>
              </form>
            </article>
          ))}

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
