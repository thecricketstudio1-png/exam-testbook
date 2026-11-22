import {
  AttemptResult,
  BilingualText,
  Question,
  QuestionResultDetail,
  ResponseValue,
  SectionBreakdown,
} from '../types/exam';

export function isResponseEmpty(resp: ResponseValue | undefined): boolean {
  if (resp === null || resp === undefined) return true;
  if (Array.isArray(resp)) return resp.length === 0;
  return resp.trim() === '';
}

export function evaluateQuestion(
  question: Question,
  userResponse: ResponseValue | undefined,
  examNegativeMarkOverride?: number,
): QuestionResultDetail {
  const resp = userResponse ?? null;
  if (isResponseEmpty(resp)) {
    return {
      question,
      userResponse: null,
      status: 'skipped',
      marksAwarded: 0,
    };
  }

  let isCorrect = false;

  if (question.type === 'MCQ') {
    isCorrect = typeof resp === 'string' && resp === question.correctAnswer;
  } else if (question.type === 'MSQ') {
    const expected = Array.isArray(question.correctAnswer)
      ? [...question.correctAnswer].sort()
      : [question.correctAnswer];
    const actual = Array.isArray(resp) ? [...resp].sort() : [];
    isCorrect =
      expected.length === actual.length &&
      expected.every((val, idx) => val === actual[idx]);
  } else if (question.type === 'NAT') {
    const expectedNum = Number(question.correctAnswer);
    const actualNum = Number(typeof resp === 'string' ? resp.trim() : '');
    if (!Number.isNaN(expectedNum) && !Number.isNaN(actualNum)) {
      isCorrect = Math.abs(expectedNum - actualNum) <= 0.01;
    }
  }

  const neg =
    examNegativeMarkOverride !== undefined
      ? examNegativeMarkOverride
      : question.negativeMark;

  const marksAwarded = isCorrect ? question.marks : -Math.abs(neg);

  return {
    question,
    userResponse: resp,
    status: isCorrect ? 'correct' : 'wrong',
    marksAwarded: Number(marksAwarded.toFixed(2)),
  };
}

export function computeAttemptResult(params: {
  testId: string;
  examId: string;
  testTitle: BilingualText;
  examName: BilingualText;
  questions: Question[];
  responses: Record<string, ResponseValue>;
  timeTakenSeconds: number;
  totalDurationSeconds: number;
  examNegativeMark: number;
}): AttemptResult {
  const {
    testId,
    examId,
    testTitle,
    examName,
    questions,
    responses,
    timeTakenSeconds,
    totalDurationSeconds,
    examNegativeMark,
  } = params;

  const details: QuestionResultDetail[] = questions.map((q) =>
    evaluateQuestion(q, responses[q.id], q.negativeMark ?? examNegativeMark),
  );

  let positiveMarks = 0;
  let negativeMarksDeducted = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let maxScore = 0;

  const sectionMap = new Map<
    string,
    {
      section: BilingualText;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
      score: number;
      maxScore: number;
    }
  >();

  for (const d of details) {
    maxScore += d.question.marks;
    if (d.status === 'correct') {
      correctCount += 1;
      positiveMarks += d.marksAwarded;
    } else if (d.status === 'wrong') {
      wrongCount += 1;
      negativeMarksDeducted += Math.abs(d.marksAwarded);
    } else {
      skippedCount += 1;
    }

    const secKey = d.question.section.en;
    const existing = sectionMap.get(secKey) ?? {
      section: d.question.section,
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      score: 0,
      maxScore: 0,
    };

    existing.total += 1;
    existing.maxScore += d.question.marks;
    existing.score += d.marksAwarded;
    if (d.status === 'correct') existing.correct += 1;
    else if (d.status === 'wrong') existing.wrong += 1;
    else existing.skipped += 1;

    sectionMap.set(secKey, existing);
  }

  const score = Number((positiveMarks - negativeMarksDeducted).toFixed(2));
  const attempted = correctCount + wrongCount;
  const accuracy = attempted > 0 ? Number(((correctCount / attempted) * 100).toFixed(1)) : 0;

  const sectionBreakdown: SectionBreakdown[] = Array.from(sectionMap.values()).map((s) => {
    const secAttempted = s.correct + s.wrong;
    return {
      ...s,
      score: Number(s.score.toFixed(2)),
      maxScore: Number(s.maxScore.toFixed(2)),
      accuracy: secAttempted > 0 ? Number(((s.correct / secAttempted) * 100).toFixed(1)) : 0,
    };
  });

  return {
    id: `attempt-${Date.now()}`,
    testId,
    examId,
    testTitle,
    examName,
    submittedAt: Date.now(),
    timeTakenSeconds,
    totalDurationSeconds,
    score,
    maxScore: Number(maxScore.toFixed(2)),
    positiveMarks: Number(positiveMarks.toFixed(2)),
    negativeMarksDeducted: Number(negativeMarksDeducted.toFixed(2)),
    accuracy,
    correctCount,
    wrongCount,
    skippedCount,
    totalQuestions: questions.length,
    sectionBreakdown,
    details,
  };
}

export function formatSecondsMMSS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
