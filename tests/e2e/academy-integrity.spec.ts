import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { loginAs } from "./support";

test("Academy rejects forged lesson ownership and unscored assessment submissions", async ({ page }) => {
  test.setTimeout(120_000);
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const unique = randomUUID().slice(0, 8);
  const slug = `e2e-academy-integrity-${unique}`;
  let firstCourseId: string | null = null;
  let secondCourseId: string | null = null;

  try {
    const [user] = await sql<{ id: string }[]>`
      select id from users where email = 'user.demo@terumbu.eco' limit 1
    `;
    expect(user?.id).toBeTruthy();

    const [first] = await sql<{ id: string }[]>`
      insert into courses (title, slug, level, duration_minutes, summary, status)
      values ('E2E Integrity Academy', ${slug}, 'Beginner', 10, 'Automated learner integrity fixture.', 'published')
      returning id
    `;
    firstCourseId = first.id;

    const [second] = await sql<{ id: string }[]>`
      insert into courses (title, slug, level, duration_minutes, summary, status)
      values ('E2E Foreign Academy', ${slug + "-foreign"}, 'Beginner', 10, 'Foreign course fixture.', 'published')
      returning id
    `;
    secondCourseId = second.id;

    const [validLesson] = await sql<{ id: string }[]>`
      insert into course_lessons (course_id, title, slug, position, duration_minutes)
      values (${firstCourseId}, 'Integrity Lesson', 'integrity-lesson', 1, 10) returning id
    `;
    const [foreignLesson] = await sql<{ id: string }[]>`
      insert into course_lessons (course_id, title, slug, position, duration_minutes)
      values (${secondCourseId}, 'Foreign Lesson', 'foreign-lesson', 1, 10) returning id
    `;

    const [enrollment] = await sql<{ id: string }[]>`
      insert into course_enrollments (user_id, course_id, status)
      values (${user.id}, ${firstCourseId}, 'active') returning id
    `;

    const [realAssessment] = await sql<{ id: string }[]>`
      insert into course_assessments (course_id, title, slug, passing_score, status)
      values (${firstCourseId}, 'Configured Assessment', 'configured-assessment', 80, 'active') returning id
    `;
    const [emptyAssessment] = await sql<{ id: string }[]>`
      insert into course_assessments (course_id, title, slug, passing_score, status)
      values (${firstCourseId}, 'Empty Assessment', 'empty-assessment', 80, 'active') returning id
    `;
    const [question] = await sql<{ id: string }[]>`
      insert into assessment_questions (assessment_id, question_text, position, points, status)
      values (${realAssessment.id}, 'What protects reefs?', 1, 1, 'active') returning id
    `;
    await sql`
      insert into assessment_choices (question_id, choice_text, is_correct, position)
      values (${question.id}, 'Careful restoration', true, 1),
        (${question.id}, 'Pollution', false, 2)
    `;

    await loginAs(page, "user.demo@terumbu.eco", `/academy/courses/${slug}`);

    // The actual HTML form is tampered with a valid UUID owned by another course.
    const lessonForm = page.locator('form:has(input[name="lessonId"])').first();
    await expect(lessonForm.getByRole("button", { name: "Complete" })).toBeVisible();
    await lessonForm.locator('input[name="lessonId"]').evaluate((node, value) => {
      (node as HTMLInputElement).value = value;
    }, foreignLesson.id);
    await Promise.all([
      page.waitForURL(/error=enrollment/),
      lessonForm.getByRole("button", { name: "Complete" }).click()
    ]);
    const [wrong] = await sql<{ total: number }[]>`
      select count(*)::int as total from lesson_progress
      where enrollment_id = ${enrollment.id} and lesson_id = ${foreignLesson.id}
    `;
    expect(wrong.total).toBe(0);

    await page.goto(`/academy/courses/${slug}`);
    const [before] = await sql<{ total: number }[]>`
      select count(*)::int as total from assessment_attempts
      where assessment_id in (${realAssessment.id}, ${emptyAssessment.id}) and user_id = ${user.id}
    `;
    expect(before.total).toBe(0);
    // A learner cannot submit an assessment before completing every lesson.
    await expect(page.getByText("Complete all lessons to unlock").first()).toBeVisible();

    const validForm = page.locator('form:has(input[name="lessonId"])').first();
    await expect(validForm.locator('input[name="lessonId"]')).toHaveValue(validLesson.id);
    await Promise.all([
      page.waitForURL(/academy\/courses\/.*course-outline/),
      validForm.getByRole("button", { name: "Complete" }).click()
    ]);

    await page.goto(`/academy/courses/${slug}`);
    await expect(page.getByText("Assessment setup pending")).toBeVisible();
    await expect(page.getByText(/must configure questions before learners can submit/)).toBeVisible();

    // Reuse the valid Next.js server action form and forge the target assessment ID.
    const assessmentForm = page.locator('form:has(input[name="assessmentId"])').first();
    await expect(assessmentForm.getByRole("button", { name: "Submit Assessment" })).toBeVisible();
    await assessmentForm.locator('input[name="assessmentId"]').evaluate((node, value) => {
      (node as HTMLInputElement).value = value;
    }, emptyAssessment.id);
    await assessmentForm.evaluate((form) => {
      const score = document.createElement("input");
      score.type = "hidden";
      score.name = "score";
      score.value = "100";
      form.appendChild(score);
    });
    await assessmentForm.locator('input[type="radio"]').first().check();
    await Promise.all([
      page.waitForURL(/error=assessment-unavailable/),
      assessmentForm.getByRole("button", { name: "Submit Assessment" }).click()
    ]);

    const [attempts] = await sql<{ total: number }[]>`
      select count(*)::int as total from assessment_attempts
      where assessment_id = ${emptyAssessment.id} and user_id = ${user.id}
    `;
    const [certificates] = await sql<{ total: number }[]>`
      select count(*)::int as total from course_certificates
      where course_id = ${firstCourseId} and user_id = ${user.id}
    `;
    expect(attempts.total).toBe(0);
    expect(certificates.total).toBe(0);
  } finally {
    if (firstCourseId) await sql`delete from courses where id = ${firstCourseId}`;
    if (secondCourseId) await sql`delete from courses where id = ${secondCourseId}`;
    await sql.end();
  }
});
