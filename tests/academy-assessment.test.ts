import assert from "node:assert/strict";
import test from "node:test";

import {
  assessmentAttemptCount,
  assessmentAttemptHistory,
  buildAssessmentAnalytics,
  buildAssessmentAttemptMetadata,
  scoreAssessmentChoices,
  selectedChoiceIdsFromAssessmentMetadata,
  type AssessmentChoiceScoreRow
} from "../src/lib/academy-assessment";

const rows: AssessmentChoiceScoreRow[] = [
  { questionId: "q1", questionPosition: 1, points: 2, choiceId: "q1-a", isCorrect: true },
  { questionId: "q1", questionPosition: 1, points: 2, choiceId: "q1-b", isCorrect: false },
  { questionId: "q2", questionPosition: 2, points: 1, choiceId: "q2-a", isCorrect: false },
  { questionId: "q2", questionPosition: 2, points: 1, choiceId: "q2-b", isCorrect: true }
];

test("academy assessment scoring compares selected choices to correct answers", () => {
  const result = scoreAssessmentChoices(rows, {
    q1: "q1-a",
    q2: "q2-a"
  });

  assert.equal(result.score, 67);
  assert.equal(result.earnedPoints, 2);
  assert.equal(result.maxPoints, 3);
  assert.equal(result.answeredQuestions, 2);
  assert.deepEqual(result.selectedChoiceIds, { q1: "q1-a", q2: "q2-a" });
  assert.deepEqual(result.correctChoiceIds, { q1: "q1-a", q2: "q2-b" });
});

test("academy assessment metadata tracks latest attempt and bounded history", () => {
  const firstResult = scoreAssessmentChoices(rows, { q1: "q1-b", q2: "q2-a" });
  const first = buildAssessmentAttemptMetadata({
    previousMetadata: null,
    result: firstResult,
    status: "failed",
    submittedAt: new Date("2026-07-14T08:00:00.000Z")
  });
  const secondResult = scoreAssessmentChoices(rows, { q1: "q1-a", q2: "q2-b" });
  const second = buildAssessmentAttemptMetadata({
    previousMetadata: first,
    result: secondResult,
    status: "passed",
    submittedAt: new Date("2026-07-14T09:00:00.000Z")
  });

  assert.equal(assessmentAttemptCount(second), 2);
  assert.equal(assessmentAttemptHistory(second).length, 2);
  assert.equal(assessmentAttemptHistory(second)[0].status, "passed");
  assert.deepEqual(selectedChoiceIdsFromAssessmentMetadata(second), { q1: "q1-a", q2: "q2-b" });
});

test("academy assessment analytics summarize attempts and question misses", () => {
  const passedResult = scoreAssessmentChoices(rows, { q1: "q1-a", q2: "q2-b" });
  const failedResult = scoreAssessmentChoices(rows, { q1: "q1-a", q2: "q2-a" });
  const passedMetadata = buildAssessmentAttemptMetadata({
    previousMetadata: null,
    result: passedResult,
    status: "passed",
    submittedAt: new Date("2026-07-14T08:00:00.000Z")
  });
  const failedMetadata = buildAssessmentAttemptMetadata({
    previousMetadata: passedMetadata,
    result: failedResult,
    status: "failed",
    submittedAt: new Date("2026-07-15T08:00:00.000Z")
  });

  const analytics = buildAssessmentAnalytics(
    [
      {
        userId: "learner-1",
        learnerName: "Raka",
        learnerEmail: "raka@example.test",
        score: 100,
        status: "passed",
        submittedAt: new Date("2026-07-14T08:00:00.000Z"),
        metadata: passedMetadata
      },
      {
        userId: "learner-2",
        learnerName: "Sari",
        learnerEmail: "sari@example.test",
        score: 67,
        status: "failed",
        submittedAt: new Date("2026-07-15T08:00:00.000Z"),
        metadata: failedMetadata
      }
    ],
    [
      { id: "q1", text: "Question one", position: 1 },
      { id: "q2", text: "Question two", position: 2 }
    ]
  );

  assert.equal(analytics.latestAttemptCount, 2);
  assert.equal(analytics.totalSubmissions, 3);
  assert.equal(analytics.passRate, 50);
  assert.equal(analytics.averageScore, 84);
  assert.equal(analytics.latestAttempt?.learnerName, "Sari");
  assert.equal(analytics.questionStats[0].questionId, "q2");
  assert.equal(analytics.questionStats[0].missRate, 50);
});
