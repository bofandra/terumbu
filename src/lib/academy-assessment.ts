export type AssessmentChoiceScoreRow = {
  questionId: string;
  questionPosition: number;
  points: number;
  choiceId: string;
  isCorrect: boolean;
};

export type AssessmentSelectionResult = {
  questionId: string;
  selectedChoiceId: string | null;
  correctChoiceId: string | null;
  correct: boolean;
  points: number;
  earnedPoints: number;
};

export type AssessmentScoreResult = {
  score: number;
  earnedPoints: number;
  maxPoints: number;
  totalQuestions: number;
  answeredQuestions: number;
  selectedChoiceIds: Record<string, string>;
  correctChoiceIds: Record<string, string>;
  selections: AssessmentSelectionResult[];
};

export type AssessmentAttemptHistoryItem = {
  score: number;
  status: "passed" | "failed";
  submittedAt: string;
  earnedPoints: number;
  maxPoints: number;
  totalQuestions: number;
  answeredQuestions: number;
  selectedChoiceIds: Record<string, string>;
  correctChoiceIds: Record<string, string>;
};

export type AssessmentAnalyticsAttempt = {
  userId?: string | null;
  learnerName?: string | null;
  learnerEmail?: string | null;
  score: number;
  status: string;
  submittedAt: Date;
  metadata: unknown;
};

export type AssessmentAnalyticsQuestion = {
  id: string;
  text: string;
  position: number;
};

export type AssessmentQuestionAnalytics = {
  questionId: string;
  questionText: string;
  position: number;
  answeredCount: number;
  correctCount: number;
  missedCount: number;
  missRate: number;
};

export type AssessmentAnalytics = {
  latestAttemptCount: number;
  totalSubmissions: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  passRate: number;
  latestAttempt: {
    userId: string | null;
    learnerName: string | null;
    learnerEmail: string | null;
    score: number;
    status: string;
    submittedAt: Date;
    attemptCount: number;
  } | null;
  questionStats: AssessmentQuestionAnalytics[];
};

export type AssessmentCompletionRequirement = {
  assessmentId: string;
};

export type AssessmentCompletionAttempt = {
  assessmentId: string;
  score: number;
  status: string;
};

type SelectionInput = ReadonlyMap<string, string | null | undefined> | Record<string, string | null | undefined>;

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringMap(value: unknown): Record<string, string> {
  const source = jsonRecord(value);
  const output: Record<string, string> = {};

  for (const [key, entry] of Object.entries(source)) {
    if (typeof entry === "string" && entry.trim()) {
      output[key] = entry;
    }
  }

  return output;
}

function selectedValue(input: SelectionInput, questionId: string) {
  const value =
    "get" in input && typeof input.get === "function"
      ? input.get(questionId)
      : (input as Record<string, string | null | undefined>)[questionId];

  return typeof value === "string" && value.trim() ? value : null;
}

export function manualAssessmentScore(score: number): AssessmentScoreResult {
  const normalizedScore = clampScore(score);

  return {
    score: normalizedScore,
    earnedPoints: normalizedScore,
    maxPoints: 100,
    totalQuestions: 0,
    answeredQuestions: normalizedScore > 0 ? 1 : 0,
    selectedChoiceIds: {},
    correctChoiceIds: {},
    selections: []
  };
}

export function nextAvailableAssessmentSlug(baseSlug: string, takenSlugs: Iterable<string>) {
  const normalizedBase = baseSlug.trim() || "assessment";
  const taken = new Set(Array.from(takenSlugs).map((slug) => slug.trim()).filter(Boolean));

  if (!taken.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  while (taken.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBase}-${suffix}`;
}

export function summarizeAssessmentCompletion(
  requiredAssessments: AssessmentCompletionRequirement[],
  attempts: AssessmentCompletionAttempt[]
) {
  const attemptByAssessment = new Map(attempts.map((attempt) => [attempt.assessmentId, attempt]));
  const passedAttempts = requiredAssessments
    .map((assessment) => attemptByAssessment.get(assessment.assessmentId) ?? null)
    .filter((attempt): attempt is AssessmentCompletionAttempt => attempt?.status === "passed");
  const passedAll = requiredAssessments.length > 0 && passedAttempts.length === requiredAssessments.length;
  const averageScore = passedAll
    ? clampScore(passedAttempts.reduce((total, attempt) => total + clampScore(Number(attempt.score)), 0) / passedAttempts.length)
    : null;

  return {
    requiredAssessmentCount: requiredAssessments.length,
    passedAssessmentCount: passedAttempts.length,
    passedAll,
    averageScore
  };
}

export function scoreAssessmentChoices(rows: AssessmentChoiceScoreRow[], selectedByQuestion: SelectionInput): AssessmentScoreResult {
  const questions = new Map<string, { position: number; points: number; correctChoiceId: string | null }>();

  for (const row of rows) {
    const existing = questions.get(row.questionId);

    if (!existing) {
      questions.set(row.questionId, {
        position: row.questionPosition,
        points: Math.max(0, row.points),
        correctChoiceId: row.isCorrect ? row.choiceId : null
      });
      continue;
    }

    if (row.isCorrect && !existing.correctChoiceId) {
      existing.correctChoiceId = row.choiceId;
    }
  }

  const selections = Array.from(questions.entries())
    .sort(([, a], [, b]) => a.position - b.position)
    .map(([questionId, question]) => {
      const selectedChoiceId = selectedValue(selectedByQuestion, questionId);
      const correct = Boolean(selectedChoiceId && question.correctChoiceId && selectedChoiceId === question.correctChoiceId);

      return {
        questionId,
        selectedChoiceId,
        correctChoiceId: question.correctChoiceId,
        correct,
        points: question.points,
        earnedPoints: correct ? question.points : 0
      };
    });

  const earnedPoints = selections.reduce((total, selection) => total + selection.earnedPoints, 0);
  const maxPoints = selections.reduce((total, selection) => total + selection.points, 0);
  const selectedChoiceIds = Object.fromEntries(
    selections
      .filter((selection): selection is AssessmentSelectionResult & { selectedChoiceId: string } => Boolean(selection.selectedChoiceId))
      .map((selection) => [selection.questionId, selection.selectedChoiceId])
  );
  const correctChoiceIds = Object.fromEntries(
    selections
      .filter((selection): selection is AssessmentSelectionResult & { correctChoiceId: string } => Boolean(selection.correctChoiceId))
      .map((selection) => [selection.questionId, selection.correctChoiceId])
  );

  return {
    score: clampScore((earnedPoints / Math.max(1, maxPoints)) * 100),
    earnedPoints,
    maxPoints,
    totalQuestions: selections.length,
    answeredQuestions: selections.filter((selection) => selection.selectedChoiceId).length,
    selectedChoiceIds,
    correctChoiceIds,
    selections
  };
}

export function assessmentAttemptHistory(metadata: unknown): AssessmentAttemptHistoryItem[] {
  const history = jsonRecord(metadata).history;

  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      const record = jsonRecord(entry);
      const status = record.status === "passed" ? "passed" : "failed";
      const submittedAt = typeof record.submittedAt === "string" ? record.submittedAt : "";

      if (!submittedAt) {
        return null;
      }

      return {
        score: clampScore(Number(record.score)),
        status,
        submittedAt,
        earnedPoints: Math.max(0, Math.round(Number(record.earnedPoints) || 0)),
        maxPoints: Math.max(0, Math.round(Number(record.maxPoints) || 0)),
        totalQuestions: Math.max(0, Math.round(Number(record.totalQuestions) || 0)),
        answeredQuestions: Math.max(0, Math.round(Number(record.answeredQuestions) || 0)),
        selectedChoiceIds: stringMap(record.selectedChoiceIds),
        correctChoiceIds: stringMap(record.correctChoiceIds)
      };
    })
    .filter((entry): entry is AssessmentAttemptHistoryItem => Boolean(entry));
}

export function assessmentAttemptCount(metadata: unknown) {
  const record = jsonRecord(metadata);
  const count = Number(record.attemptCount);

  if (Number.isFinite(count) && count > 0) {
    return Math.round(count);
  }

  return assessmentAttemptHistory(metadata).length;
}

export function selectedChoiceIdsFromAssessmentMetadata(metadata: unknown) {
  const record = jsonRecord(metadata);
  const latest = jsonRecord(record.latest);
  const fromLatest = stringMap(latest.selectedChoiceIds);

  if (Object.keys(fromLatest).length > 0) {
    return fromLatest;
  }

  return stringMap(record.selectedChoiceIds);
}

export function correctChoiceIdsFromAssessmentMetadata(metadata: unknown) {
  const record = jsonRecord(metadata);
  const latest = jsonRecord(record.latest);
  const fromLatest = stringMap(latest.correctChoiceIds);

  if (Object.keys(fromLatest).length > 0) {
    return fromLatest;
  }

  return stringMap(record.correctChoiceIds);
}

export function buildAssessmentAttemptMetadata({
  previousMetadata,
  result,
  status,
  submittedAt,
  source = "assessment_form",
  maxHistory = 5
}: {
  previousMetadata: unknown;
  result: AssessmentScoreResult;
  status: "passed" | "failed";
  submittedAt: Date;
  source?: string;
  maxHistory?: number;
}) {
  const submittedAtIso = submittedAt.toISOString();
  const previous = jsonRecord(previousMetadata);
  const attemptCount = assessmentAttemptCount(previousMetadata) + 1;
  const latest: AssessmentAttemptHistoryItem = {
    score: result.score,
    status,
    submittedAt: submittedAtIso,
    earnedPoints: result.earnedPoints,
    maxPoints: result.maxPoints,
    totalQuestions: result.totalQuestions,
    answeredQuestions: result.answeredQuestions,
    selectedChoiceIds: result.selectedChoiceIds,
    correctChoiceIds: result.correctChoiceIds
  };

  return {
    ...previous,
    source,
    attemptCount,
    latest,
    selectedChoiceIds: result.selectedChoiceIds,
    correctChoiceIds: result.correctChoiceIds,
    history: [latest, ...assessmentAttemptHistory(previousMetadata)].slice(0, Math.max(1, maxHistory))
  };
}

export function buildAssessmentAnalytics(
  attempts: AssessmentAnalyticsAttempt[],
  questions: AssessmentAnalyticsQuestion[] = []
): AssessmentAnalytics {
  const latestAttempts = [...attempts].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  const latestAttemptCount = latestAttempts.length;
  const totalSubmissions = latestAttempts.reduce((total, attempt) => total + Math.max(1, assessmentAttemptCount(attempt.metadata)), 0);
  const passedCount = latestAttempts.filter((attempt) => attempt.status === "passed").length;
  const failedCount = latestAttempts.filter((attempt) => attempt.status === "failed").length;
  const averageScore = latestAttemptCount
    ? Math.round(latestAttempts.reduce((total, attempt) => total + clampScore(Number(attempt.score)), 0) / latestAttemptCount)
    : 0;
  const latestAttempt = latestAttempts[0]
    ? {
        userId: latestAttempts[0].userId ?? null,
        learnerName: latestAttempts[0].learnerName ?? null,
        learnerEmail: latestAttempts[0].learnerEmail ?? null,
        score: clampScore(Number(latestAttempts[0].score)),
        status: latestAttempts[0].status,
        submittedAt: latestAttempts[0].submittedAt,
        attemptCount: Math.max(1, assessmentAttemptCount(latestAttempts[0].metadata))
      }
    : null;
  const questionStats = questions
    .map((question) => {
      let answeredCount = 0;
      let correctCount = 0;
      let missedCount = 0;

      for (const attempt of latestAttempts) {
        const selectedChoiceId = selectedChoiceIdsFromAssessmentMetadata(attempt.metadata)[question.id];
        const correctChoiceId = correctChoiceIdsFromAssessmentMetadata(attempt.metadata)[question.id];

        if (!selectedChoiceId) {
          continue;
        }

        answeredCount += 1;
        if (correctChoiceId && selectedChoiceId === correctChoiceId) {
          correctCount += 1;
        } else {
          missedCount += 1;
        }
      }

      return {
        questionId: question.id,
        questionText: question.text,
        position: question.position,
        answeredCount,
        correctCount,
        missedCount,
        missRate: answeredCount ? Math.round((missedCount / answeredCount) * 100) : 0
      };
    })
    .sort((a, b) => b.missRate - a.missRate || a.position - b.position);

  return {
    latestAttemptCount,
    totalSubmissions,
    passedCount,
    failedCount,
    averageScore,
    passRate: latestAttemptCount ? Math.round((passedCount / latestAttemptCount) * 100) : 0,
    latestAttempt,
    questionStats
  };
}
