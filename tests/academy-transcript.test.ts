import assert from "node:assert/strict";
import test from "node:test";

import {
  academyLearningStreak,
  academyTranscriptFilename,
  buildAcademyTranscriptCsv,
  type AcademyTranscriptRecord
} from "../src/lib/academy-transcript";

const transcript: AcademyTranscriptRecord = {
  learnerName: "Raka Demo",
  learnerEmail: "raka@example.test",
  generatedAt: new Date("2026-07-14T10:00:00.000Z"),
  currentStreakDays: 2,
  longestStreakDays: 4,
  latestActivityAt: new Date("2026-07-14T08:00:00.000Z"),
  completedCourses: 1,
  certificatesEarned: 1,
  courses: [
    {
      courseTitle: "Coral Restoration Basics",
      courseSlug: "coral-restoration-basics",
      courseLevel: "Beginner",
      status: "completed",
      progressPercent: 100,
      completedLessons: 3,
      totalLessons: 3,
      remainingMinutes: 0,
      enrolledAt: new Date("2026-07-10T00:00:00.000Z"),
      completedAt: new Date("2026-07-14T08:00:00.000Z"),
      assessmentStatus: "passed",
      assessmentScore: 92,
      assessmentSubmittedAt: new Date("2026-07-14T08:00:00.000Z"),
      certificateNumber: "TRB-CERT-2026-ABC123",
      certificatePublicSlug: "cert-public",
      certificateIssuedAt: new Date("2026-07-14T08:05:00.000Z")
    }
  ]
};

test("academy learning streak counts current and longest consecutive activity days", () => {
  assert.deepEqual(
    academyLearningStreak(
      [
        new Date("2026-07-10T08:00:00.000Z"),
        new Date("2026-07-11T08:00:00.000Z"),
        new Date("2026-07-13T08:00:00.000Z"),
        new Date("2026-07-14T08:00:00.000Z")
      ],
      new Date("2026-07-14T12:00:00.000Z")
    ),
    {
      currentStreakDays: 2,
      longestStreakDays: 2,
      latestActivityAt: new Date("2026-07-14T08:00:00.000Z")
    }
  );
  assert.equal(academyLearningStreak([new Date("2026-07-10T08:00:00.000Z")], new Date("2026-07-14T12:00:00.000Z")).currentStreakDays, 0);
});

test("academy transcript filename is stable and safe", () => {
  assert.equal(academyTranscriptFilename(transcript), "terumbu-academy-transcript-raka-demo.csv");
  assert.equal(academyTranscriptFilename({ learnerName: "!!!" }), "terumbu-academy-transcript-learner.csv");
});

test("academy transcript csv includes summary, course rows, and escaped cells", () => {
  const csv = buildAcademyTranscriptCsv(
    {
      ...transcript,
      learnerName: 'Raka "Demo"',
      courses: [{ ...transcript.courses[0], courseTitle: "Coral, Restoration Basics" }]
    },
    "https://example.test"
  );

  assert.match(csv, /"Raka ""Demo"""/);
  assert.match(csv, /"Coral, Restoration Basics"/);
  assert.match(csv, /https:\/\/example.test\/certificates\/verify\/cert-public/);
  assert.match(csv, /Current streak days,2/);
});
