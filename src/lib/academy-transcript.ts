import { buildPdfDocument, PDF_COLORS, PDF_PAGE_HEIGHT, PDF_PAGE_WIDTH, pdfRectangleCommand, pdfTextCommand, wrapPdfText } from "@/lib/pdf-document";

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

function safeFileSlug(value: string, fallback: string) {
  const safeName = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || fallback;
}

function transcriptDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "Not recorded";
}

function transcriptValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not recorded" : String(value);
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
  return `terumbu-academy-transcript-${safeFileSlug(record.learnerName, "learner")}.csv`;
}

export function academyCourseTranscriptFilename(record: Pick<AcademyTranscriptRecord, "learnerName">, course: Pick<AcademyTranscriptCourse, "courseSlug" | "courseTitle">) {
  return `terumbu-academy-transcript-${safeFileSlug(record.learnerName, "learner")}-${safeFileSlug(course.courseSlug || course.courseTitle, "course")}.pdf`;
}

export function academyTranscriptCertificateUrl(course: Pick<AcademyTranscriptCourse, "certificatePublicSlug">, origin = "https://terumbu.eco") {
  return course.certificatePublicSlug ? `${origin}/certificates/verify/${course.certificatePublicSlug}` : null;
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

export function buildAcademyCourseTranscriptPdf(record: AcademyTranscriptRecord, course: AcademyTranscriptCourse, origin = "https://terumbu.eco") {
  const certificateUrl = academyTranscriptCertificateUrl(course, origin);
  const rows = [
    ["Learner", record.learnerName],
    ["Email", record.learnerEmail],
    ["Course", course.courseTitle],
    ["Level", course.courseLevel],
    ["Status", course.status],
    ["Progress", `${course.progressPercent}%`],
    ["Lessons", `${course.completedLessons}/${Math.max(1, course.totalLessons)} completed`],
    ["Remaining minutes", course.remainingMinutes.toLocaleString("id-ID")],
    ["Enrolled", transcriptDate(course.enrolledAt)],
    ["Completed", transcriptDate(course.completedAt)],
    ["Assessment status", transcriptValue(course.assessmentStatus)],
    ["Assessment score", course.assessmentScore === null ? "Not recorded" : `${course.assessmentScore}`],
    ["Assessment submitted", transcriptDate(course.assessmentSubmittedAt)],
    ["Certificate number", transcriptValue(course.certificateNumber)],
    ["Certificate URL", certificateUrl ?? "Not issued"]
  ];
  const commands = [
    pdfRectangleCommand(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, PDF_COLORS.sand),
    pdfRectangleCommand(48, 70, 499, 704, PDF_COLORS.white, PDF_COLORS.border),
    pdfTextCommand({ text: "Terumbu Academy Transcript", x: 76, y: 734, size: 11, font: "bold", color: PDF_COLORS.coral }),
    pdfTextCommand({ text: course.courseTitle, x: 76, y: 696, size: 25, font: "bold" }),
    pdfTextCommand({ text: record.learnerName, x: 76, y: 666, size: 17, font: "bold", color: PDF_COLORS.kelp }),
    pdfRectangleCommand(76, 610, 443, 34, PDF_COLORS.seal),
    pdfTextCommand({ text: `Generated ${transcriptDate(record.generatedAt)} / Per-course transcript`, x: 96, y: 623, size: 10, font: "bold", color: PDF_COLORS.ocean })
  ];
  let y = 576;

  rows.forEach(([label, value]) => {
    const wrappedValue = wrapPdfText(value, 292, 10.5);

    commands.push(pdfTextCommand({ text: label, x: 76, y, size: 9.5, font: "bold", color: PDF_COLORS.muted }));
    wrappedValue.forEach((line, index) => {
      commands.push(pdfTextCommand({ text: line, x: 230, y: y - index * 14, size: 10.5, font: "bold" }));
    });
    y -= Math.max(25, wrappedValue.length * 14 + 8);
  });

  commands.push(pdfRectangleCommand(76, 98, 443, 56, PDF_COLORS.wash));
  wrapPdfText("This transcript is generated from Terumbu Academy enrollment, lesson, assessment, and certificate records for the selected course.", 393, 10.5).forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x: 100, y: 130 - index * 14, size: 10.5, font: "bold", color: PDF_COLORS.ocean }));
  });
  commands.push(pdfTextCommand({ text: "Generated by Terumbu.eco", x: 76, y: 80, size: 9, color: PDF_COLORS.muted }));

  return buildPdfDocument(commands.join("\n"));
}
