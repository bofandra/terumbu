export type AcademyTranscriptCourse = {
  courseTitle: string;
  courseSlug: string;
  courseLevel: string;
  status: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  remainingMinutes: number;
  enrolledAt: Date;
  completedAt: Date | null;
  assessmentStatus: string | null;
  assessmentScore: number | null;
  assessmentSubmittedAt: Date | null;
  certificateNumber: string | null;
  certificatePublicSlug: string | null;
  certificateIssuedAt: Date | null;
};

export type AcademyTranscriptRecord = {
  learnerName: string;
  learnerEmail: string;
  generatedAt: Date;
  currentStreakDays: number;
  longestStreakDays: number;
  latestActivityAt: Date | null;
  completedCourses: number;
  certificatesEarned: number;
  courses: AcademyTranscriptCourse[];
};

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDaysToKey(key: string, days: number) {
  const value = new Date(`${key}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);

  return dateKey(value);
}

function csvCell(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = value instanceof Date ? value.toISOString() : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvRow(values: Array<string | number | Date | null | undefined>) {
  return values.map(csvCell).join(",");
}

export function academyLearningStreak(activityDates: Array<Date | null | undefined>, referenceDate = new Date()) {
  const dates = activityDates.filter((value): value is Date => value instanceof Date && Number.isFinite(value.getTime()));
  const days = new Set(dates.map(dateKey));
  const sortedDays = Array.from(days).sort();

  let longestStreakDays = 0;
  let currentRun = 0;
  let previousDay: string | null = null;

  for (const day of sortedDays) {
    currentRun = previousDay && addDaysToKey(previousDay, 1) === day ? currentRun + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, currentRun);
    previousDay = day;
  }

  const latestActivityAt = dates.sort((first, second) => second.getTime() - first.getTime())[0] ?? null;
  const latestDay = latestActivityAt ? dateKey(latestActivityAt) : null;
  const today = dateKey(referenceDate);
  const yesterday = addDaysToKey(today, -1);
  let currentStreakDays = 0;

  if (latestDay && (latestDay === today || latestDay === yesterday)) {
    for (let cursor: string | null = latestDay; cursor && days.has(cursor); cursor = addDaysToKey(cursor, -1)) {
      currentStreakDays += 1;
    }
  }

  return {
    currentStreakDays,
    longestStreakDays,
    latestActivityAt
  };
}

export function academyTranscriptFilename(record: Pick<AcademyTranscriptRecord, "learnerName">) {
  const safeName = record.learnerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `terumbu-academy-transcript-${safeName || "learner"}.csv`;
}

export function buildAcademyTranscriptCsv(record: AcademyTranscriptRecord, origin = "https://terumbu.eco") {
  const rows = [
    csvRow(["Terumbu Academy Transcript"]),
    csvRow(["Learner", record.learnerName]),
    csvRow(["Email", record.learnerEmail]),
    csvRow(["Generated at", record.generatedAt]),
    csvRow(["Current streak days", record.currentStreakDays]),
    csvRow(["Longest streak days", record.longestStreakDays]),
    csvRow(["Latest activity at", record.latestActivityAt]),
    csvRow(["Completed courses", record.completedCourses]),
    csvRow(["Certificates earned", record.certificatesEarned]),
    "",
    csvRow([
      "Course",
      "Status",
      "Progress %",
      "Completed lessons",
      "Total lessons",
      "Remaining minutes",
      "Enrolled at",
      "Completed at",
      "Assessment status",
      "Assessment score",
      "Assessment submitted at",
      "Certificate number",
      "Certificate URL"
    ]),
    ...record.courses.map((course) =>
      csvRow([
        course.courseTitle,
        course.status,
        course.progressPercent,
        course.completedLessons,
        course.totalLessons,
        course.remainingMinutes,
        course.enrolledAt,
        course.completedAt,
        course.assessmentStatus,
        course.assessmentScore,
        course.assessmentSubmittedAt,
        course.certificateNumber,
        course.certificatePublicSlug ? `${origin}/certificates/verify/${course.certificatePublicSlug}` : null
      ])
    )
  ];

  return `${rows.join("\n")}\n`;
}
