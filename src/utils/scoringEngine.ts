import {
  AttemptResult,
  BilingualText,
  MockTest,
  Question,
  QuestionResultDetail,
  ResponseValue,
  SectionBreakdown,
} from '../types/exam';

export type ExamMarkingCategory =
  | 'railway_upsc'
  | 'ssc_banking'
  | 'police_tet'
  | 'engineering'
  | 'defence_other';

export interface ExamCbtProfile {
  examId: string;
  markingCategory: ExamMarkingCategory;
  markingRuleLabel: BilingualText;
  effectiveNegativeMark: number;
  isSectionLocked: boolean;
  hasScientificCalculator: boolean;
  patternBadge: BilingualText;
  simulatedCandidates: number;
  cutoffPercentages: {
    general: number;
    obc: number;
    ews: number;
    sc: number;
    st: number;
  };
}

export interface QuestionSyllabusMeta {
  patternTag: BilingualText;
  topicTag: BilingualText;
  sourceTag: BilingualText;
  weightageLabel: BilingualText;
}

export type CutoffCategoryId = 'general' | 'obc' | 'ews' | 'sc' | 'st';

export type CutoffStatus = 'qualified' | 'borderline' | 'not_qualified';

export interface CategoryCutoffEntry {
  category: CutoffCategoryId;
  label: BilingualText;
  cutoffPercent: number;
  cutoffMarks: number;
  status: CutoffStatus;
  deltaMarks: number;
}

export interface RealExamAnalytics {
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  normalizedScaleMax: number;
  normalizationShiftDelta: number;
  percentile: number;
  expectedAir: number;
  totalCandidates: number;
  highestCategoryQualified: CutoffCategoryId | null;
  categoryCutoffs: CategoryCutoffEntry[];
}

export function isResponseEmpty(resp: ResponseValue | undefined): boolean {
  if (resp === null || resp === undefined) return true;
  if (Array.isArray(resp)) return resp.length === 0;
  return resp.trim() === '';
}

export function formatSecondsMMSS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function resolveExamCbtProfile(examId: string, test?: Pick<MockTest, 'negativeMark' | 'title'>): ExamCbtProfile {
  const id = examId.toLowerCase();
  const titleEn = (test?.title?.en || '').toLowerCase();

  const isEngineering =
    id === 'gate' ||
    id.includes('ssc-je') ||
    id.includes('rrb-je') ||
    id.includes('state-je') ||
    id.includes('psu-tech') ||
    id.includes('isro-tech') ||
    id.includes('drdo-ceptam') ||
    titleEn.includes('gate') ||
    titleEn.includes('ssc je') ||
    titleEn.includes('rrb je');

  const isBanking =
    id.startsWith('ibps-') ||
    id.startsWith('sbi-') ||
    id.startsWith('rbi-') ||
    titleEn.includes('ibps') ||
    titleEn.includes('sbi') ||
    titleEn.includes('rbi');

  const isRailway = id.startsWith('rrb-') || id.startsWith('rpf-');
  const isUpscPsc =
    id.startsWith('upsc-') ||
    id === 'jpsc' ||
    id.startsWith('jpsc-') ||
    id === 'bpsc' ||
    id.startsWith('bpsc-') ||
    id.startsWith('rpsc-') ||
    id.startsWith('uppsc-') ||
    id.startsWith('mppsc') ||
    id === 'hpsc' ||
    id === 'ukpsc' ||
    id === 'cgpsc' ||
    id === 'opsc';

  const isSsc = id.startsWith('ssc-');

  const isPoliceOrTet =
    id.includes('police') ||
    id === 'ctet' ||
    id === 'jtet' ||
    id === 'uptet' ||
    id === 'btet' ||
    id === 'reet' ||
    id === 'state-tet' ||
    id === 'kvs';

  if (isPoliceOrTet) {
    return {
      examId,
      markingCategory: 'police_tet',
      markingRuleLabel: {
        en: 'No Negative Marking (0)',
        hi: 'कोई नकारात्मक अंकन नहीं (0)',
      },
      effectiveNegativeMark: 0,
      isSectionLocked: false,
      hasScientificCalculator: false,
      patternBadge: {
        en: '2026–27 State Police / TET Pattern',
        hi: '2026–27 राज्य पुलिस / TET पैटर्न',
      },
      simulatedCandidates: 92000,
      cutoffPercentages: {
        general: 62,
        obc: 57,
        ews: 56,
        sc: 50,
        st: 46,
      },
    };
  }

  if (isEngineering) {
    const neg = isRailway || id === 'gate' || id.includes('state-je') ? 0.33 : 0.25;
    return {
      examId,
      markingCategory: 'engineering',
      markingRuleLabel:
        neg === 0.33
          ? {en: '1/3 Negative (-0.33)', hi: '1/3 नकारात्मक (-0.33)'}
          : {en: '1/4 Negative (-0.25)', hi: '1/4 नकारात्मक (-0.25)'},
      effectiveNegativeMark: neg,
      isSectionLocked: false,
      hasScientificCalculator: true,
      patternBadge: {
        en: '2026–27 Technical CBT • Virtual Calc',
        hi: '2026–27 टेक्निकल CBT • वर्चुअल कैलकुलेटर',
      },
      simulatedCandidates: 64000,
      cutoffPercentages: {
        general: 64,
        obc: 58,
        ews: 57,
        sc: 48,
        st: 44,
      },
    };
  }

  if (isBanking) {
    return {
      examId,
      markingCategory: 'ssc_banking',
      markingRuleLabel: {
        en: '1/4 Negative (-0.25) • Sectional Lock',
        hi: '1/4 नकारात्मक (-0.25) • सेक्शनल लॉक',
      },
      effectiveNegativeMark: 0.25,
      isSectionLocked: true,
      hasScientificCalculator: false,
      patternBadge: {
        en: '2026–27 IBPS / SBI Sectional CBT',
        hi: '2026–27 IBPS / SBI सेक्शनल CBT',
      },
      simulatedCandidates: 118000,
      cutoffPercentages: {
        general: 63,
        obc: 58,
        ews: 57,
        sc: 50,
        st: 44,
      },
    };
  }

  if (isSsc) {
    return {
      examId,
      markingCategory: 'ssc_banking',
      markingRuleLabel: {
        en: '1/4 Negative (-0.25)',
        hi: '1/4 नकारात्मक (-0.25)',
      },
      effectiveNegativeMark: 0.25,
      isSectionLocked: false,
      hasScientificCalculator: false,
      patternBadge: {
        en: '2026–27 TCS iON SSC CBT',
        hi: '2026–27 TCS iON SSC CBT',
      },
      simulatedCandidates: 150000,
      cutoffPercentages: {
        general: 71,
        obc: 66,
        ews: 65,
        sc: 58,
        st: 52,
      },
    };
  }

  if (isRailway || isUpscPsc) {
    return {
      examId,
      markingCategory: 'railway_upsc',
      markingRuleLabel: {
        en: '1/3 Negative (-0.33)',
        hi: '1/3 नकारात्मक (-0.33)',
      },
      effectiveNegativeMark: 0.33,
      isSectionLocked: false,
      hasScientificCalculator: false,
      patternBadge: isRailway
        ? {en: '2026–27 RRB TCS iON Pattern', hi: '2026–27 RRB TCS iON पैटर्न'}
        : {en: '2026–27 UPSC / PSC Pattern', hi: '2026–27 UPSC / PSC पैटर्न'},
      simulatedCandidates: isRailway ? 185000 : 84000,
      cutoffPercentages: isRailway
        ? {general: 68, obc: 63, ews: 61, sc: 54, st: 49}
        : {general: 54, obc: 50, ews: 49, sc: 44, st: 40},
    };
  }

  const fallbackNeg =
    test?.negativeMark !== undefined ? Math.max(0, Number(test.negativeMark.toFixed(2))) : 0.25;

  return {
    examId,
    markingCategory: 'defence_other',
    markingRuleLabel:
      fallbackNeg === 0
        ? {en: 'No Negative Marking (0)', hi: 'कोई नकारात्मक अंकन नहीं (0)'}
        : {en: `Negative (-${fallbackNeg})`, hi: `नकारात्मक (-${fallbackNeg})`},
    effectiveNegativeMark: fallbackNeg,
    isSectionLocked: false,
    hasScientificCalculator: false,
    patternBadge: {
      en: '2026–27 NTA / Govt CBT Standard',
      hi: '2026–27 NTA / सरकारी CBT मानक',
    },
    simulatedCandidates: 75000,
    cutoffPercentages: {
      general: 65,
      obc: 60,
      ews: 58,
      sc: 52,
      st: 47,
    },
  };
}

export function getQuestionSyllabusMeta(
  question: Question,
  examId: string,
): QuestionSyllabusMeta {
  const secEn = question.section.en.toLowerCase();
  const idLower = examId.toLowerCase();

  if (secEn.includes('science')) {
    return {
      patternTag: {en: '2026-27 Pattern', hi: '2026-27 पैटर्न'},
      topicTag: {en: 'General Science', hi: 'सामान्य विज्ञान'},
      sourceTag: {en: 'NCERT Class 10', hi: 'NCERT कक्षा 10'},
      weightageLabel: {
        en: idLower.startsWith('rrb-') ? 'Weightage: 25%' : 'Weightage: 15%',
        hi: idLower.startsWith('rrb-') ? 'भारांक: 25%' : 'भारांक: 15%',
      },
    };
  }

  if (secEn.includes('math') || secEn.includes('quant') || secEn.includes('numerical')) {
    return {
      patternTag: {en: '2026-27 Pattern', hi: '2026-27 पैटर्न'},
      topicTag: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
      sourceTag: {en: 'Arithmetic & Speed', hi: 'अंकगणित एवं गति'},
      weightageLabel: {en: 'Weightage: 30%', hi: 'भारांक: 30%'},
    };
  }

  if (secEn.includes('reason') || secEn.includes('intelligence')) {
    return {
      patternTag: {en: '2026-27 Pattern', hi: '2026-27 पैटर्न'},
      topicTag: {en: 'Logical Reasoning', hi: 'तर्कशक्ति'},
      sourceTag: {en: 'Statement & Series', hi: 'कथन एवं श्रृंखला'},
      weightageLabel: {en: 'Weightage: 25%', hi: 'भारांक: 25%'},
    };
  }

  if (secEn.includes('english') || secEn.includes('comprehension')) {
    return {
      patternTag: {en: '2026-27 Pattern', hi: '2026-27 पैटर्न'},
      topicTag: {en: 'English Language', hi: 'अंग्रेजी भाषा'},
      sourceTag: {en: 'Grammar & RC', hi: 'व्याकरण एवं गद्यांश'},
      weightageLabel: {en: 'Weightage: 25%', hi: 'भारांक: 25%'},
    };
  }

  if (secEn.includes('computer') || secEn.includes('tech')) {
    return {
      patternTag: {en: '2026-27 Pattern', hi: '2026-27 पैटर्न'},
      topicTag: {en: 'Technical / Computer', hi: 'तकनीकी / कंप्यूटर'},
      sourceTag: {en: 'Core Syllabus', hi: 'मुख्य पाठ्यक्रम'},
      weightageLabel: {en: 'Weightage: 35%', hi: 'भारांक: 35%'},
    };
  }

  return {
    patternTag: {en: '2026-27 Pattern', hi: '2026-27 पैटर्न'},
    topicTag: question.section,
    sourceTag: idLower.includes('jssc') || idLower.includes('jpsc')
      ? {en: 'Jharkhand & Static GK', hi: 'झारखंड व सामान्य ज्ञान'}
      : {en: 'Polity & Current Affairs', hi: 'राजव्यवस्था व करंट अफेयर्स'},
    weightageLabel: {en: 'Weightage: 20%', hi: 'भारांक: 20%'},
  };
}

export function buildSectionDurationsSeconds(
  sections: BilingualText[],
  totalDurationSeconds: number,
  isSectionLocked: boolean,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (sections.length === 0) return result;
  if (!isSectionLocked) {
    for (const sec of sections) {
      result[sec.en] = totalDurationSeconds;
    }
    return result;
  }

  const baseSeconds = Math.floor(totalDurationSeconds / sections.length);
  let remainder = totalDurationSeconds - baseSeconds * sections.length;

  for (const sec of sections) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    result[sec.en] = Math.max(60, baseSeconds + extra);
  }
  return result;
}

export function evaluateQuestionWithRules(
  question: Question,
  userResponse: ResponseValue | undefined,
  examNegativeMark: number,
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

  // Standard TCS iON / GATE rule: NAT questions carry 0 negative marking
  const appliedNegative = question.type === 'NAT' ? 0 : Math.abs(examNegativeMark);
  const marksAwarded = isCorrect ? question.marks : -appliedNegative;

  return {
    question,
    userResponse: resp,
    status: isCorrect ? 'correct' : 'wrong',
    marksAwarded: Number(marksAwarded.toFixed(2)),
  };
}

export function computeAttemptResultWithEngine(params: {
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

  const profile = resolveExamCbtProfile(examId, {
    negativeMark: examNegativeMark,
    title: testTitle,
  });

  const details: QuestionResultDetail[] = questions.map((q) =>
    evaluateQuestionWithRules(q, responses[q.id], profile.effectiveNegativeMark),
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

export function computeRealExamAnalytics(
  result: AttemptResult,
  profile: ExamCbtProfile,
): RealExamAnalytics {
  const safeMax = Math.max(1, result.maxScore);
  const rawPercent = Math.max(0, (result.score / safeMax) * 100);

  // Equi-percentile shift normalization bonus/adjustment based on accuracy & speed discipline
  const accuracyBonus =
    result.accuracy >= 85 && result.correctCount > 0
      ? 2.4
      : result.accuracy >= 70 && result.correctCount > 0
        ? 1.2
        : 0;

  const normalizedPercent = Math.min(100, Math.max(0, rawPercent + accuracyBonus));
  const normalizedScaleMax = 100;
  const normalizedScore = Number(normalizedPercent.toFixed(2));
  const rawScaled100 = Number(rawPercent.toFixed(2));
  const normalizationShiftDelta = Number((normalizedScore - rawScaled100).toFixed(2));

  // Logistic curve calibrated around 58% mean score for national govt exams
  let percentile = 0;
  if (result.score <= 0) {
    percentile = result.correctCount > 0 ? 12.4 : 4.2;
  } else {
    const z = (normalizedPercent - 54) / 14;
    const rawPctile = (1 / (1 + Math.exp(-z))) * 100;
    percentile = Number(Math.min(99.96, Math.max(5.5, rawPctile)).toFixed(2));
  }

  const totalCandidates = profile.simulatedCandidates;
  const expectedAir = Math.max(
    1,
    Math.min(
      totalCandidates,
      Math.round(((100 - percentile) / 100) * totalCandidates) || 1,
    ),
  );

  const labels: Record<CutoffCategoryId, BilingualText> = {
    general: {en: 'General (UR)', hi: 'सामान्य (UR)'},
    obc: {en: 'OBC (NCL)', hi: 'ओबीसी (OBC)'},
    ews: {en: 'EWS', hi: 'ईडब्ल्यूएस (EWS)'},
    sc: {en: 'SC', hi: 'अनुसूचित जाति (SC)'},
    st: {en: 'ST', hi: 'अनुसूचित जनजाति (ST)'},
  };

  const categoryOrder: CutoffCategoryId[] = ['general', 'obc', 'ews', 'sc', 'st'];
  const categoryCutoffs: CategoryCutoffEntry[] = categoryOrder.map((cat) => {
    const cutoffPercent = profile.cutoffPercentages[cat];
    const cutoffMarks = Number(((cutoffPercent / 100) * safeMax).toFixed(2));
    const deltaMarks = Number((normalizedPercent - cutoffPercent).toFixed(2));

    let status: CutoffStatus = 'not_qualified';
    if (normalizedPercent >= cutoffPercent) {
      status = 'qualified';
    } else if (normalizedPercent >= cutoffPercent - 5) {
      status = 'borderline';
    }

    return {
      category: cat,
      label: labels[cat],
      cutoffPercent,
      cutoffMarks,
      status,
      deltaMarks,
    };
  });

  const highestCategoryQualified =
    categoryCutoffs.find((c) => c.status === 'qualified')?.category ?? null;

  return {
    rawScore: result.score,
    maxScore: result.maxScore,
    normalizedScore,
    normalizedScaleMax,
    normalizationShiftDelta,
    percentile,
    expectedAir,
    totalCandidates,
    highestCategoryQualified,
    categoryCutoffs,
  };
}
