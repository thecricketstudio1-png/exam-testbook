import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  Award,
  Bookmark,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Delete,
  Grid,
  Lock,
  Maximize2,
  Minimize2,
  MinusCircle,
  Moon,
  PauseCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import {
  AttemptResult,
  BilingualText,
  Language,
  MockTest,
  Question,
  QuestionStatusFilter,
  ResponseValue,
  SavedTestProgress,
} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';
import {ExamPaperBlueprint, getExamPaperBlueprint} from '../data/exams';
import {SAMPLE_DEV_QUESTIONS} from '../data/questions';
import {
  buildSectionDurationsSeconds,
  computeAttemptResultWithEngine,
  computeRealExamAnalytics,
  ExamCbtProfile,
  formatSecondsMMSS,
  getQuestionSyllabusMeta,
  isResponseEmpty,
  resolveExamCbtProfile,
} from '../utils/scoringEngine';
import {clearTestProgress, saveTestProgress} from '../utils/storage';

interface TestEngineProps {
  test: MockTest;
  examName: BilingualText;
  questions: Question[];
  initialProgress?: SavedTestProgress | null;
  lang: Language;
  onToggleLang: (lang: Language) => void;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (q: Question) => void;
  onComplete: (result: AttemptResult) => void;
  onExit: (saved: boolean) => void;
}

const ZOOM_LEVELS = [
  {label: '90%', stem: 'text-sm sm:text-base', option: 'text-xs sm:text-sm'},
  {label: '100%', stem: 'text-base sm:text-lg', option: 'text-sm sm:text-base'},
  {label: '115%', stem: 'text-lg sm:text-xl', option: 'text-base sm:text-lg'},
  {label: '130%', stem: 'text-xl sm:text-2xl', option: 'text-lg sm:text-xl'},
] as const;

/**
 * Safe mathematical expression evaluator (recursive descent) for the built-in
 * GATE / SSC JE / RRB JE Virtual Scientific Calculator — no eval().
 */
function evaluateMathExpression(rawExpr: string, angleMode: 'DEG' | 'RAD'): number {
  const expr = rawExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, `(${Math.PI})`)
    .replace(/\be\b/g, `(${Math.E})`)
    .replace(/\s+/g, '');

  if (!expr) return 0;

  let pos = 0;

  const peek = () => expr[pos] ?? '';
  const consume = () => expr[pos++];

  const toRad = (v: number) => (angleMode === 'DEG' ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (angleMode === 'DEG' ? (v * 180) / Math.PI : v);

  const factorial = (n: number): number => {
    if (!Number.isFinite(n) || n < 0 || n > 170) return NaN;
    const rounded = Math.round(n);
    if (Math.abs(n - rounded) > 1e-9) return NaN;
    let res = 1;
    for (let i = 2; i <= rounded; i++) res *= i;
    return res;
  };

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') left = right === 0 ? NaN : left / right;
      else left = (left * right) / 100;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    return parsePostfix();
  }

  function parsePostfix(): number {
    let val = parsePrimary();
    while (peek() === '!') {
      consume();
      val = factorial(val);
    }
    return val;
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      consume();
      const val = parseExpression();
      if (peek() === ')') consume();
      return val;
    }

    // Function names
    const fnMatch = expr.slice(pos).match(/^(asin|acos|atan|sin|cos|tan|sqrt|cbrt|log|ln|abs)/);
    if (fnMatch) {
      const fn = fnMatch[1];
      pos += fn.length;
      const arg = peek() === '(' ? parsePrimary() : parseUnary();
      switch (fn) {
        case 'sin':
          return Math.sin(toRad(arg));
        case 'cos':
          return Math.cos(toRad(arg));
        case 'tan':
          return Math.tan(toRad(arg));
        case 'asin':
          return fromRad(Math.asin(arg));
        case 'acos':
          return fromRad(Math.acos(arg));
        case 'atan':
          return fromRad(Math.atan(arg));
        case 'sqrt':
          return Math.sqrt(arg);
        case 'cbrt':
          return Math.cbrt(arg);
        case 'log':
          return Math.log10(arg);
        case 'ln':
          return Math.log(arg);
        case 'abs':
          return Math.abs(arg);
      }
    }

    const numMatch = expr.slice(pos).match(/^(\d+(\.\d*)?|\.\d+)/);
    if (numMatch) {
      pos += numMatch[1].length;
      return Number(numMatch[1]);
    }

    return NaN;
  }

  const out = parseExpression();
  return pos === expr.length ? out : NaN;
}

interface ScientificCalculatorModalProps {
  lang: Language;
  darkMode: boolean;
  onClose: () => void;
}

const ScientificCalculatorPanel: React.FC<ScientificCalculatorModalProps> = ({
  lang,
  darkMode,
  onClose,
}) => {
  const [expr, setExpr] = useState('');
  const [display, setDisplay] = useState('0');
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');
  const [memory, setMemory] = useState<number>(0);

  const formatResult = (val: number): string => {
    if (!Number.isFinite(val) || Number.isNaN(val)) return 'Error';
    if (Math.abs(val) < 1e-12) return '0';
    return String(Number(val.toPrecision(10)));
  };

  const appendToken = (token: string) => {
    setExpr((prev) => {
      const next = prev === 'Error' ? token : `${prev}${token}`;
      setDisplay(next || '0');
      return next;
    });
  };

  const handleEvaluate = () => {
    const source = expr || display;
    const val = evaluateMathExpression(source, angleMode);
    const formatted = formatResult(val);
    setDisplay(formatted);
    setExpr(formatted === 'Error' ? '' : formatted);
  };

  const handleUnaryImmediate = (fn: (x: number) => number) => {
    const currentVal = expr ? evaluateMathExpression(expr, angleMode) : Number(display);
    const val = fn(currentVal);
    const formatted = formatResult(val);
    setDisplay(formatted);
    setExpr(formatted === 'Error' ? '' : formatted);
  };

  const handleClear = () => {
    setExpr('');
    setDisplay('0');
  };

  const handleBackspace = () => {
    setExpr((prev) => {
      const next = prev.slice(0, -1);
      setDisplay(next || '0');
      return next;
    });
  };

  const currentNum = Number.isFinite(evaluateMathExpression(expr || display, angleMode))
    ? evaluateMathExpression(expr || display, angleMode)
    : 0;

  return (
    <div
      className={`fixed right-3 sm:right-6 top-16 z-50 w-[332px] sm:w-[360px] rounded-2xl border shadow-2xl overflow-hidden ${
        darkMode
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* Header */}
      <div className="bg-[#1E40AF] text-white px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calculator className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="text-xs font-bold truncate">
            {lang === 'hi' ? 'वर्चुअल वैज्ञानिक कैलकुलेटर' : 'GATE / JE Scientific Calculator'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAngleMode((m) => (m === 'DEG' ? 'RAD' : 'DEG'))}
            className="px-2 py-0.5 rounded bg-blue-950/60 border border-white/25 text-[10px] font-bold font-mono-num hover:bg-blue-900"
          >
            {angleMode}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="p-1 rounded hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Display */}
      <div
        className={`px-3.5 py-2.5 border-b ${
          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400 h-4">
          <span>{memory !== 0 ? `M = ${memory}` : ''}</span>
          <span className="truncate max-w-[220px]">{expr || ' '}</span>
        </div>
        <div className="mt-0.5 text-right text-xl font-bold font-mono-num truncate">
          {display}
        </div>
      </div>

      {/* Memory Bar */}
      <div className="p-2.5 space-y-1.5">
        <div className="grid grid-cols-5 gap-1.5">
          {[
            {label: 'MC', onClick: () => setMemory(0)},
            {
              label: 'MR',
              onClick: () => {
                const s = String(memory);
                setExpr(s);
                setDisplay(s);
              },
            },
            {label: 'MS', onClick: () => setMemory(currentNum)},
            {label: 'M+', onClick: () => setMemory((m) => Number((m + currentNum).toPrecision(10)))},
            {label: 'M-', onClick: () => setMemory((m) => Number((m - currentNum).toPrecision(10)))},
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className={`h-8 rounded-lg text-[11px] font-bold font-mono-num border transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Scientific Functions */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            {label: 'sin', token: 'sin('},
            {label: 'cos', token: 'cos('},
            {label: 'tan', token: 'tan('},
            {label: 'log', token: 'log('},
            {label: 'ln', token: 'ln('},
            {label: 'asin', token: 'asin('},
            {label: 'acos', token: 'acos('},
            {label: 'atan', token: 'atan('},
            {label: '√x', token: 'sqrt('},
            {label: '∛x', token: 'cbrt('},
            {label: 'xʸ', token: '^'},
            {label: '(', token: '('},
            {label: ')', token: ')'},
            {label: 'π', token: 'π'},
            {label: 'e', token: 'e'},
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => appendToken(btn.token)}
              className={`h-8 rounded-lg text-[11px] font-semibold font-mono-num border transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-blue-200 hover:bg-slate-700'
                  : 'bg-blue-50/70 border-blue-200 text-[#1E40AF] hover:bg-blue-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Immediate Unary Row */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            {label: 'x²', onClick: () => handleUnaryImmediate((x) => x * x)},
            {label: 'x³', onClick: () => handleUnaryImmediate((x) => x * x * x)},
            {label: '1/x', onClick: () => handleUnaryImmediate((x) => (x === 0 ? NaN : 1 / x))},
            {label: '10ˣ', onClick: () => handleUnaryImmediate((x) => Math.pow(10, x))},
            {label: 'eˣ', onClick: () => handleUnaryImmediate((x) => Math.exp(x))},
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className={`h-8 rounded-lg text-[11px] font-semibold font-mono-num border transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Standard Digits & Operators */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          {[
            {label: '7', act: () => appendToken('7')},
            {label: '8', act: () => appendToken('8')},
            {label: '9', act: () => appendToken('9')},
            {label: '÷', act: () => appendToken('/'), op: true},
            {label: '4', act: () => appendToken('4')},
            {label: '5', act: () => appendToken('5')},
            {label: '6', act: () => appendToken('6')},
            {label: '×', act: () => appendToken('*'), op: true},
            {label: '1', act: () => appendToken('1')},
            {label: '2', act: () => appendToken('2')},
            {label: '3', act: () => appendToken('3')},
            {label: '−', act: () => appendToken('-'), op: true},
            {label: '0', act: () => appendToken('0')},
            {label: '.', act: () => appendToken('.')},
            {label: 'n!', act: () => appendToken('!')},
            {label: '+', act: () => appendToken('+'), op: true},
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.act}
              className={`h-9 rounded-lg text-sm font-bold font-mono-num border transition ${
                btn.op
                  ? darkMode
                    ? 'bg-indigo-950 border-indigo-800 text-indigo-200 hover:bg-indigo-900'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                  : darkMode
                    ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Bottom Control Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={handleClear}
            className="h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => handleUnaryImmediate((x) => -x)}
            className={`h-9 rounded-lg border text-xs font-bold font-mono-num ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            +/−
          </button>
          <button
            type="button"
            onClick={handleEvaluate}
            className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold font-mono-num"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};

function filterPoolForBlueprintSection(
  pool: Question[],
  targetSectionEn: string,
  preferRailway: boolean,
): Question[] {
  const sec = targetSectionEn.toLowerCase();
  const matches = pool.filter((q) => {
    const qSec = q.section.en.toLowerCase();
    const qTags = (q.tags ?? []).join(' ').toLowerCase();

    if (sec.includes('math') || sec.includes('quant') || sec.includes('numerical')) {
      return (
        qSec.includes('math') ||
        qSec.includes('quant') ||
        qSec.includes('numerical') ||
        qTags.includes('arithmetic') ||
        qTags.includes('mensuration') ||
        qTags.includes('algebra') ||
        qTags.includes('profit')
      );
    }

    if (sec.includes('reason') || sec.includes('intelligence')) {
      return qSec.includes('reason') || qSec.includes('intelligence');
    }

    if (sec.includes('science & gk') || sec.includes('science & ga')) {
      return (
        qSec.includes('science') ||
        qSec.includes('awareness') ||
        qSec.includes('knowledge') ||
        qSec.includes('gk')
      );
    }

    if (sec.includes('science')) {
      return qSec.includes('science');
    }

    if (
      sec.includes('awareness') ||
      sec.includes('gk') ||
      sec.includes('general knowledge') ||
      sec.includes('polity') ||
      sec.includes('history') ||
      sec.includes('geography')
    ) {
      return (
        qSec.includes('awareness') ||
        qSec.includes('knowledge') ||
        qSec.includes('gk')
      );
    }

    if (sec.includes('english') || sec.includes('comprehension')) {
      return qSec.includes('english') || qSec.includes('comprehension');
    }

    if (sec.includes('technical') || sec.includes('engineering')) {
      return qSec.includes('science') || qSec.includes('quant') || qSec.includes('math');
    }

    return false;
  });

  const baseList = matches.length > 0 ? matches : pool;
  if (!preferRailway) return baseList;

  const railwayFirst = baseList.filter(
    (q) =>
      q.id.startsWith('rrb-') ||
      (q.tags ?? []).some((tag) => tag.toLowerCase().includes('rrb')),
  );
  const others = baseList.filter((q) => !railwayFirst.includes(q));
  return [...railwayFirst, ...others];
}

function assembleFullLengthPaper(
  test: MockTest,
  rawQuestions: Question[],
  blueprint: ExamPaperBlueprint,
  effectiveNegativeMark: number,
): Question[] {
  if (test.id === 'custom-admin-test') {
    return rawQuestions;
  }

  const importedNonSample = rawQuestions.filter(
    (q) =>
      !q.isSampleDevData &&
      !(q.tags ?? []).includes('2026-27 Syllabus Practice'),
  );

  // When a full JSON pack (>= exam's real totalQuestions) is imported via Admin, use it directly
  if (importedNonSample.length >= blueprint.totalQuestions) {
    return importedNonSample.slice(0, blueprint.totalQuestions);
  }

  const pool =
    rawQuestions.length > 0 ? rawQuestions : SAMPLE_DEV_QUESTIONS;
  const preferRailway =
    test.examId.startsWith('rrb-') || test.examId.startsWith('rpf-');

  let seed = 0;
  for (let i = 0; i < test.id.length; i++) {
    seed = (seed * 31 + test.id.charCodeAt(i)) >>> 0;
  }

  const targetCount = Math.max(1, blueprint.totalQuestions);
  const marksPerQuestion = Number((blueprint.totalMarks / targetCount).toFixed(2)) || 1;

  const assembled: Question[] = [];
  let globalSlot = 0;

  blueprint.sections.forEach((secBlueprint, sIdx) => {
    const secPool = filterPoolForBlueprintSection(
      pool,
      secBlueprint.section.en,
      preferRailway,
    );
    const safePool = secPool.length > 0 ? secPool : pool;

    for (let i = 0; i < secBlueprint.questionCount; i++) {
      globalSlot += 1;
      const src = safePool[(seed + sIdx * 7 + i) % safePool.length];
      assembled.push({
        ...src,
        id: `${test.id}::s${sIdx + 1}::q${globalSlot}::${src.id}`,
        section: secBlueprint.section,
        marks: marksPerQuestion,
        negativeMark: src.type === 'NAT' ? 0 : effectiveNegativeMark,
      });
    }
  });

  return assembled;
}

export const TestEngine: React.FC<TestEngineProps> = ({
  test,
  examName,
  questions: rawQuestions,
  initialProgress,
  lang,
  onToggleLang,
  bookmarkedIds,
  onToggleBookmark,
  onComplete,
  onExit,
}) => {
  const blueprint = useMemo(
    () => getExamPaperBlueprint(test.examId, test),
    [test],
  );

  const totalDurationSeconds = (blueprint.durationMinutes || test.durationMinutes) * 60;

  const baseCbtProfile = useMemo(
    () => resolveExamCbtProfile(test.examId, test),
    [test],
  );

  const cbtProfile: ExamCbtProfile = useMemo(() => {
    if (test.examId.startsWith('ssc-') && blueprint.negativeMark > 0) {
      const neg = blueprint.negativeMark;
      return {
        ...baseCbtProfile,
        effectiveNegativeMark: neg,
        markingRuleLabel:
          neg === 0.5
            ? {en: '1/4 of 2 Marks (-0.50)', hi: '2 अंकों का 1/4 (-0.50)'}
            : neg === 1
              ? {en: 'Negative Marking (-1.00)', hi: 'नकारात्मक अंकन (-1.00)'}
              : baseCbtProfile.markingRuleLabel,
      };
    }
    return baseCbtProfile;
  }, [baseCbtProfile, test.examId, blueprint.negativeMark]);

  const questions = useMemo(
    () =>
      assembleFullLengthPaper(
        test,
        rawQuestions,
        blueprint,
        cbtProfile.effectiveNegativeMark,
      ),
    [test, rawQuestions, blueprint, cbtProfile.effectiveNegativeMark],
  );

  // Unique section list from assembled questions (matching real-exam section order)
  const sections = useMemo(() => {
    const seen = new Map<string, BilingualText>();
    for (const q of questions) {
      if (!seen.has(q.section.en)) {
        seen.set(q.section.en, q.section);
      }
    }
    return Array.from(seen.values());
  }, [questions]);

  const sectionQuestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      counts[q.section.en] = (counts[q.section.en] ?? 0) + 1;
    }
    return counts;
  }, [questions]);

  const sectionDurations = useMemo(() => {
    if (!cbtProfile.isSectionLocked) {
      return buildSectionDurationsSeconds(sections, totalDurationSeconds, false);
    }
    const hasExplicitSectionMinutes = blueprint.sections.every(
      (s) => typeof s.durationMinutes === 'number' && s.durationMinutes > 0,
    );
    if (hasExplicitSectionMinutes && blueprint.sections.length === sections.length) {
      const mapped: Record<string, number> = {};
      for (const s of blueprint.sections) {
        mapped[s.section.en] = (s.durationMinutes ?? 20) * 60;
      }
      return mapped;
    }
    return buildSectionDurationsSeconds(sections, totalDurationSeconds, true);
  }, [sections, totalDurationSeconds, cbtProfile.isSectionLocked, blueprint.sections]);

  const initialSectionIdx = useMemo(() => {
    if (!initialProgress || !questions.length) return 0;
    const safeIdx = Math.min(initialProgress.currentIndex, questions.length - 1);
    const q = questions[safeIdx];
    const sIdx = sections.findIndex((s) => s.en === q?.section.en);
    return sIdx >= 0 ? sIdx : 0;
  }, [initialProgress, questions, sections]);

  const [stage, setStage] = useState<'instructions' | 'testing' | 'analytics'>(
    initialProgress ? 'testing' : 'instructions',
  );
  const [currentIndex, setCurrentIndex] = useState<number>(
    initialProgress
      ? Math.min(initialProgress.currentIndex, Math.max(0, questions.length - 1))
      : 0,
  );
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(initialSectionIdx);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(
    initialProgress?.responses ?? {},
  );
  const [marked, setMarked] = useState<Record<string, boolean>>(
    initialProgress?.marked ?? {},
  );
  const [visited, setVisited] = useState<Record<string, boolean>>(() => {
    if (initialProgress?.visited) return initialProgress.visited;
    return questions[0] ? {[questions[0].id]: true} : {};
  });

  const [timeLeft, setTimeLeft] = useState<number>(
    initialProgress ? initialProgress.timeLeft : totalDurationSeconds,
  );
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number>(() => {
    const sec = sections[initialSectionIdx];
    const secFull = sec ? sectionDurations[sec.en] ?? totalDurationSeconds : totalDurationSeconds;
    if (initialProgress) {
      const laterSectionsSeconds = sections
        .slice(initialSectionIdx + 1)
        .reduce((acc, s) => acc + (sectionDurations[s.en] ?? 0), 0);
      const inferred = Math.max(1, initialProgress.timeLeft - laterSectionsSeconds);
      return Math.min(secFull, inferred);
    }
    return secFull;
  });

  const [showPaletteMobile, setShowPaletteMobile] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // New 2026–2027 CBT Facilities State
  const [zoomIndex, setZoomIndex] = useState<number>(1);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);

  // Submission Analytics State
  const [submittedResult, setSubmittedResult] = useState<AttemptResult | null>(null);
  const [solutionFilter, setSolutionFilter] = useState<QuestionStatusFilter>('all');

  const submittedRef = useRef(false);
  const currentQuestion = questions[currentIndex];
  const activeLockedSection = sections[activeSectionIndex];

  // Clear section notice automatically
  useEffect(() => {
    if (!lockNotice) return;
    const tId = window.setTimeout(() => setLockNotice(null), 3200);
    return () => window.clearTimeout(tId);
  }, [lockNotice]);

  // Mark current question visited
  useEffect(() => {
    if (stage === 'testing' && currentQuestion) {
      setVisited((prev) => {
        if (prev[currentQuestion.id]) return prev;
        return {...prev, [currentQuestion.id]: true};
      });
    }
  }, [stage, currentQuestion]);

  // Auto-save progress to localStorage whenever state updates in testing stage
  useEffect(() => {
    if (stage !== 'testing' || submittedRef.current) return;
    const progress: SavedTestProgress = {
      testId: test.id,
      examId: test.examId,
      testTitle: test.title,
      examName,
      responses,
      marked,
      visited,
      timeLeft,
      totalDurationSeconds,
      currentIndex,
      language: lang,
      updatedAt: Date.now(),
    };
    saveTestProgress(progress);
  }, [
    stage,
    test.id,
    test.examId,
    test.title,
    examName,
    responses,
    marked,
    visited,
    timeLeft,
    totalDurationSeconds,
    currentIndex,
    lang,
  ]);

  const handleFinalSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearTestProgress();
    setShowSubmitModal(false);
    setShowCalculator(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    const timeTaken = Math.max(1, totalDurationSeconds - timeLeft);
    let result = computeAttemptResultWithEngine({
      testId: test.id,
      examId: test.examId,
      testTitle: test.title,
      examName,
      questions,
      responses,
      timeTakenSeconds: timeTaken,
      totalDurationSeconds,
      examNegativeMark: cbtProfile.effectiveNegativeMark,
    });

    if (cbtProfile.effectiveNegativeMark !== baseCbtProfile.effectiveNegativeMark) {
      const adjustedDetails = result.details.map((d) => {
        if (d.status !== 'wrong') return d;
        const neg = d.question.type === 'NAT' ? 0 : Math.abs(cbtProfile.effectiveNegativeMark);
        return {
          ...d,
          marksAwarded: Number((-neg).toFixed(2)),
        };
      });
      let pos = 0;
      let negDeducted = 0;
      const secScores = new Map<string, number>();
      for (const d of adjustedDetails) {
        if (d.status === 'correct') pos += d.marksAwarded;
        else if (d.status === 'wrong') negDeducted += Math.abs(d.marksAwarded);
        secScores.set(
          d.question.section.en,
          (secScores.get(d.question.section.en) ?? 0) + d.marksAwarded,
        );
      }
      result = {
        ...result,
        details: adjustedDetails,
        positiveMarks: Number(pos.toFixed(2)),
        negativeMarksDeducted: Number(negDeducted.toFixed(2)),
        score: Number((pos - negDeducted).toFixed(2)),
        sectionBreakdown: result.sectionBreakdown.map((sb) => ({
          ...sb,
          score: Number((secScores.get(sb.section.en) ?? sb.score).toFixed(2)),
        })),
      };
    }

    setSubmittedResult(result);
    setStage('analytics');
  }, [
    totalDurationSeconds,
    timeLeft,
    test,
    examName,
    questions,
    responses,
    cbtProfile.effectiveNegativeMark,
    baseCbtProfile.effectiveNegativeMark,
  ]);

  // Live countdown timer (total & section-locked)
  useEffect(() => {
    if (stage !== 'testing') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      if (cbtProfile.isSectionLocked) {
        setSectionTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, cbtProfile.isSectionLocked]);

  // Section-Locked Auto-Switch on Section Timeout
  useEffect(() => {
    if (
      stage !== 'testing' ||
      !cbtProfile.isSectionLocked ||
      sectionTimeLeft > 0 ||
      submittedRef.current
    ) {
      return;
    }

    if (activeSectionIndex < sections.length - 1) {
      const nextSecIdx = activeSectionIndex + 1;
      const nextSec = sections[nextSecIdx];
      const nextQIdx = questions.findIndex((q) => q.section.en === nextSec.en);
      setActiveSectionIndex(nextSecIdx);
      setSectionTimeLeft(sectionDurations[nextSec.en] ?? 60);
      if (nextQIdx !== -1) {
        setCurrentIndex(nextQIdx);
      }
      setLockNotice(
        lang === 'hi'
          ? `पिछले अनुभाग का समय समाप्त — "${nextSec.hi}" शुरू हो गया है`
          : `Section time over — auto-switched to "${nextSec.en}"`,
      );
    } else {
      handleFinalSubmit();
    }
  }, [
    stage,
    cbtProfile.isSectionLocked,
    sectionTimeLeft,
    activeSectionIndex,
    sections,
    questions,
    sectionDurations,
    lang,
    handleFinalSubmit,
  ]);

  // Overall auto-submit when total time reaches 00:00
  useEffect(() => {
    if (stage === 'testing' && timeLeft === 0 && !submittedRef.current) {
      handleFinalSubmit();
    }
  }, [stage, timeLeft, handleFinalSubmit]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen restriction gracefully
    }
  };

  // Palette statistics
  const stats = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let markedCount = 0;
    let notVisited = 0;

    for (const q of questions) {
      const hasAns = !isResponseEmpty(responses[q.id]);
      const isMarked = !!marked[q.id];
      const isVisited = !!visited[q.id];

      if (isMarked) markedCount += 1;
      if (hasAns) answered += 1;
      else if (isVisited) notAnswered += 1;
      else notVisited += 1;
    }
    return {answered, notAnswered, markedCount, notVisited};
  }, [questions, responses, marked, visited]);

  // Allowed question indices in section-locked mode
  const activeSectionQuestionIndices = useMemo(() => {
    if (!cbtProfile.isSectionLocked || !activeLockedSection) {
      return questions.map((_, idx) => idx);
    }
    const list: number[] = [];
    questions.forEach((q, idx) => {
      if (q.section.en === activeLockedSection.en) list.push(idx);
    });
    return list;
  }, [cbtProfile.isSectionLocked, activeLockedSection, questions]);

  const isQuestionInActiveSection = useCallback(
    (q: Question) => {
      if (!cbtProfile.isSectionLocked || !activeLockedSection) return true;
      return q.section.en === activeLockedSection.en;
    },
    [cbtProfile.isSectionLocked, activeLockedSection],
  );

  const handleSelectMCQ = (qId: string, optionId: string) => {
    setResponses((prev) => ({...prev, [qId]: optionId}));
  };

  const handleToggleMSQ = (qId: string, optionId: string) => {
    setResponses((prev) => {
      const current = Array.isArray(prev[qId]) ? (prev[qId] as string[]) : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {...prev, [qId]: next};
    });
  };

  const handleNATInput = (qId: string, val: string) => {
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      setResponses((prev) => ({...prev, [qId]: val}));
    }
  };

  const handleKeypadPress = (key: string) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const curr = typeof responses[qId] === 'string' ? (responses[qId] as string) : '';
    if (key === 'CLEAR') {
      setResponses((prev) => ({...prev, [qId]: ''}));
    } else if (key === 'BACK') {
      setResponses((prev) => ({...prev, [qId]: curr.slice(0, -1)}));
    } else if (key === '-') {
      if (curr.startsWith('-')) {
        setResponses((prev) => ({...prev, [qId]: curr.slice(1)}));
      } else {
        setResponses((prev) => ({...prev, [qId]: `-${curr}`}));
      }
    } else if (key === '.') {
      if (!curr.includes('.')) {
        setResponses((prev) => ({...prev, [qId]: curr === '' ? '0.' : `${curr}.`}));
      }
    } else {
      handleNATInput(qId, `${curr}${key}`);
    }
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setResponses((prev) => ({...prev, [currentQuestion.id]: null}));
    setMarked((prev) => ({...prev, [currentQuestion.id]: false}));
  };

  const goToNextAllowedQuestion = useCallback(() => {
    const pos = activeSectionQuestionIndices.indexOf(currentIndex);
    if (pos >= 0 && pos < activeSectionQuestionIndices.length - 1) {
      setCurrentIndex(activeSectionQuestionIndices[pos + 1]);
    }
  }, [activeSectionQuestionIndices, currentIndex]);

  const goToPrevAllowedQuestion = useCallback(() => {
    const pos = activeSectionQuestionIndices.indexOf(currentIndex);
    if (pos > 0) {
      setCurrentIndex(activeSectionQuestionIndices[pos - 1]);
    }
  }, [activeSectionQuestionIndices, currentIndex]);

  const handleMarkAndNext = () => {
    if (!currentQuestion) return;
    setMarked((prev) => ({...prev, [currentQuestion.id]: true}));
    goToNextAllowedQuestion();
  };

  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    setMarked((prev) => ({...prev, [currentQuestion.id]: false}));
    goToNextAllowedQuestion();
  };

  const handleSectionJump = (secEn: string, secIdx: number) => {
    if (cbtProfile.isSectionLocked && secIdx !== activeSectionIndex) {
      setLockNotice(
        lang === 'hi'
          ? 'यह अनुभाग अभी लॉक है — वर्तमान अनुभाग का टाइमर समाप्त होने पर अगला अनुभाग खुलेगा।'
          : 'Section locked (IBPS pattern) — next section unlocks automatically when current timer ends.',
      );
      return;
    }
    const idx = questions.findIndex((q) => q.section.en === secEn);
    if (idx !== -1) setCurrentIndex(idx);
  };

  const getPaletteStatusClass = (
    q: Question,
    isCurrent: boolean,
    locked: boolean,
  ) => {
    if (locked) {
      return darkMode
        ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed opacity-55'
        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60';
    }

    const hasAns = !isResponseEmpty(responses[q.id]);
    const isMarked = !!marked[q.id];
    const isVisited = !!visited[q.id];

    const ring = isCurrent
      ? darkMode
        ? 'ring-2 ring-offset-1 ring-offset-slate-900 ring-amber-400'
        : 'ring-2 ring-offset-1 ring-[#1E40AF]'
      : '';

    if (isMarked) {
      return `bg-violet-600 text-white border-violet-700 ${ring}`;
    }
    if (hasAns) {
      return `bg-emerald-600 text-white border-emerald-700 ${ring}`;
    }
    if (isVisited) {
      return `bg-red-600 text-white border-red-700 ${ring}`;
    }
    return darkMode
      ? `bg-slate-800 text-slate-200 border-slate-600 ${ring}`
      : `bg-slate-200 text-slate-700 border-slate-300 ${ring}`;
  };

  const handlePauseAndExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit(true);
  };

  const handleRetakeInEngine = () => {
    submittedRef.current = false;
    setSubmittedResult(null);
    setResponses({});
    setMarked({});
    setVisited(questions[0] ? {[questions[0].id]: true} : {});
    setCurrentIndex(0);
    setActiveSectionIndex(0);
    setTimeLeft(totalDurationSeconds);
    const firstSec = sections[0];
    setSectionTimeLeft(
      firstSec ? sectionDurations[firstSec.en] ?? totalDurationSeconds : totalDurationSeconds,
    );
    setSolutionFilter('all');
    setStage('testing');
  };

  const realAnalytics = useMemo(() => {
    if (!submittedResult) return null;
    return computeRealExamAnalytics(submittedResult, cbtProfile);
  }, [submittedResult, cbtProfile]);

  const filteredSolutionDetails = useMemo(() => {
    if (!submittedResult) return [];
    if (solutionFilter === 'all') return submittedResult.details;
    return submittedResult.details.filter((d) => d.status === solutionFilter);
  }, [submittedResult, solutionFilter]);

  const zoom = ZOOM_LEVELS[zoomIndex];

  // --- STAGE 1: INSTRUCTIONS SCREEN ---
  if (stage === 'instructions') {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col overflow-y-auto ${
          darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
        }`}
      >
        <header className="bg-[#1E40AF] text-white px-4 sm:px-6 h-14 flex items-center justify-between gap-2 shrink-0">
          <div className="font-bold text-sm sm:text-base truncate">
            {t(examName, lang)} — {t(test.title, lang)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle Night Mode"
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex items-center bg-blue-950/50 border border-white/20 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onToggleLang('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md ${
                  lang === 'en' ? 'bg-white text-[#1E40AF]' : 'text-blue-100'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('hi')}
                className={`px-2 py-1 text-xs font-semibold rounded-md ${
                  lang === 'hi' ? 'bg-white text-[#1E40AF]' : 'text-blue-100'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10">
          <div
            className={`border rounded-xl p-5 sm:p-8 shadow-xs ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-[#1E40AF] text-xs font-bold border border-blue-200">
                <Sparkles className="w-3.5 h-3.5" />
                {t(cbtProfile.patternBadge, lang)}
              </span>
              {cbtProfile.isSectionLocked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                  <Lock className="w-3.5 h-3.5" />
                  {lang === 'hi' ? 'सेक्शनल लॉक व टाइमर सक्रिय' : 'Sectional Lock & Timer Active'}
                </span>
              )}
              {cbtProfile.hasScientificCalculator && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <Calculator className="w-3.5 h-3.5" />
                  {lang === 'hi' ? 'वैज्ञानिक कैलकुलेटर सक्षम' : 'Virtual Scientific Calc Enabled'}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-xl sm:text-2xl font-bold">
              {t(UI_COPY.cbt.instructionsTitle, lang)}
            </h1>

            <div
              className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              <span>
                {t(UI_COPY.exams.duration, lang)}:{' '}
                <strong className="font-mono-num">
                  {blueprint.durationMinutes} {t(UI_COPY.exams.mins, lang)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t(UI_COPY.exams.totalMarks, lang)}:{' '}
                <strong className="font-mono-num">{blueprint.totalMarks}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t(UI_COPY.exams.negativeMark, lang)}:{' '}
                <strong className="font-mono-num">{t(cbtProfile.markingRuleLabel, lang)}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'hi' ? 'कुल प्रश्न' : 'Questions'}:{' '}
                <strong className="font-mono-num">{questions.length}</strong>
              </span>
            </div>

            {/* Real-Exam Section Pattern Breakdown */}
            <div
              className={`mt-5 border rounded-xl overflow-hidden ${
                darkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div
                className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide border-b ${
                  darkMode
                    ? 'border-slate-800 text-blue-300 bg-slate-900'
                    : 'border-slate-200 text-[#1E40AF] bg-blue-50/60'
                }`}
              >
                {lang === 'hi'
                  ? 'वास्तविक परीक्षा अनुभाग एवं प्रश्न वितरण'
                  : 'Official Section-Wise Question Distribution'}
              </div>
              <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200/70'}`}>
                {blueprint.sections.map((secBp, idx) => (
                  <div
                    key={secBp.section.en}
                    className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <span className="font-semibold">
                      {idx + 1}. {t(secBp.section, lang)}
                    </span>
                    <div className="flex items-center gap-3 font-mono-num shrink-0">
                      <span className="font-bold text-[#2563EB]">
                        {secBp.questionCount} {lang === 'hi' ? 'प्रश्न' : 'Qs'}
                      </span>
                      {cbtProfile.isSectionLocked && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                          {Math.round((sectionDurations[secBp.section.en] ?? 1200) / 60)}{' '}
                          {lang === 'hi' ? 'मिनट' : 'Mins'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`mt-6 border-t pt-6 space-y-3 text-sm leading-relaxed ${
                darkMode ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
              }`}
            >
              {lang === 'hi' ? (
                <>
                  <p>
                    1. परीक्षा के नियम: <strong>{t(cbtProfile.markingRuleLabel, lang)}</strong> लागू है। समय समाप्त होते ही टेस्ट स्वतः सबमिट हो जाएगा।
                  </p>
                  <p>
                    2. {cbtProfile.isSectionLocked
                      ? 'बैंकिंग (IBPS/SBI) पैटर्न के अनुसार प्रत्येक अनुभाग का अलग टाइमर है और समय समाप्त होने पर अगला अनुभाग स्वतः खुलेगा।'
                      : 'आप किसी भी अनुभाग और प्रश्न के बीच स्वतंत्र रूप से जा सकते हैं।'}
                  </p>
                  <p>
                    3. प्रश्न पठन के लिए हेडर में <strong>A+ / A-</strong> फ़ॉन्ट ज़ूम और <strong>नाइट मोड</strong> उपलब्ध है। {cbtProfile.hasScientificCalculator ? 'इंजीनियरिंग परीक्षा के लिए वर्चुअल वैज्ञानिक कैलकुलेटर भी उपलब्ध है।' : ''}
                  </p>
                  <p>
                    4. सबमिट करने पर तुरंत <strong>All-India Rank, Percentile, Normalized Score</strong> और <strong>2026–2027 श्रेणी कटऑफ (Gen/OBC/EWS/SC/ST)</strong> विश्लेषण दिखेगा।
                  </p>
                </>
              ) : (
                <>
                  <p>
                    1. Official Marking Scheme: <strong>{t(cbtProfile.markingRuleLabel, lang)}</strong> is automatically enforced (NAT carries 0 negative mark). Auto-submits cleanly at <code className="font-mono-num">00:00</code>.
                  </p>
                  <p>
                    2. {cbtProfile.isSectionLocked
                      ? 'Section-Locked IBPS/SBI Mode: Each section has its own countdown timer and automatically advances when time expires.'
                      : 'Free-Navigation TCS iON Mode: Switch freely across all sections and question palette numbers.'}
                  </p>
                  <p>
                    3. Use <strong>A+ / A-</strong> zoom and <strong>Night Mode</strong> in the header for long statement-based questions. {cbtProfile.hasScientificCalculator ? 'A built-in Virtual Scientific Calculator is available in the top bar.' : ''}
                  </p>
                  <p>
                    4. On submission, view your <strong>Expected All-India Rank, Percentile, Normalized Score, and 2026–2027 Category Cutoff Status</strong> with bilingual solutions.
                  </p>
                </>
              )}
            </div>

            {/* Palette Legend */}
            <div
              className={`mt-6 border rounded-xl p-4 ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <h2 className="text-sm font-semibold mb-3">{t(UI_COPY.cbt.paletteTitle, lang)}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-mono-num font-bold">
                    1
                  </span>
                  <span>{t(UI_COPY.cbt.answered, lang)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-red-600 text-white flex items-center justify-center font-mono-num font-bold">
                    2
                  </span>
                  <span>{t(UI_COPY.cbt.notAnswered, lang)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-violet-600 text-white flex items-center justify-center font-mono-num font-bold">
                    3
                  </span>
                  <span>{t(UI_COPY.cbt.marked, lang)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center font-mono-num font-bold">
                    4
                  </span>
                  <span>{t(UI_COPY.cbt.notVisited, lang)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onExit(false)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg border text-sm font-semibold transition min-h-[44px] ${
                  darkMode
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t(UI_COPY.cbt.backBtn, lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage('testing');
                  if (questions[0]) {
                    setVisited((prev) => ({...prev, [questions[0].id]: true}));
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition shadow-xs min-h-[44px]"
              >
                {t(UI_COPY.cbt.readyBtn, lang)}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- STAGE 3: POST-SUBMISSION REAL EXAM ANALYTICS & CUTOFF PREDICTOR ---
  if (stage === 'analytics' && submittedResult && realAnalytics) {
    const formatUserAns = (q: Question, resp: ResponseValue): string => {
      if (resp === null || resp === undefined) return t(UI_COPY.result.notAttempted, lang);
      if (q.type === 'NAT') return String(resp);
      if (Array.isArray(resp)) {
        if (resp.length === 0) return t(UI_COPY.result.notAttempted, lang);
        return resp
          .map((id) => {
            const idx = q.options?.findIndex((o) => o.id === id) ?? -1;
            return idx >= 0 ? String.fromCharCode(65 + idx) : id.toUpperCase();
          })
          .join(', ');
      }
      const idx = q.options?.findIndex((o) => o.id === resp) ?? -1;
      return idx >= 0 ? String.fromCharCode(65 + idx) : String(resp).toUpperCase();
    };

    const formatExpectedAns = (q: Question): string => {
      if (q.type === 'NAT') return String(q.correctAnswer);
      const ids = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      return ids
        .map((id) => {
          const idx = q.options?.findIndex((o) => o.id === id) ?? -1;
          return idx >= 0 ? String.fromCharCode(65 + idx) : id.toUpperCase();
        })
        .join(', ');
    };

    const statusBadgeClass = (status: 'qualified' | 'borderline' | 'not_qualified') => {
      if (status === 'qualified') {
        return darkMode
          ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
          : 'bg-emerald-50 border-emerald-300 text-emerald-800';
      }
      if (status === 'borderline') {
        return darkMode
          ? 'bg-amber-950/70 border-amber-700 text-amber-300'
          : 'bg-amber-50 border-amber-300 text-amber-800';
      }
      return darkMode
        ? 'bg-rose-950/70 border-rose-800 text-rose-300'
        : 'bg-rose-50 border-rose-200 text-rose-700';
    };

    const statusLabel = (status: 'qualified' | 'borderline' | 'not_qualified') => {
      if (status === 'qualified') return lang === 'hi' ? 'चयन योग्य (QUALIFIED)' : 'QUALIFIED';
      if (status === 'borderline') return lang === 'hi' ? 'सीमांत (BORDERLINE)' : 'BORDERLINE';
      return lang === 'hi' ? 'अयोग्य (BELOW CUTOFF)' : 'NOT QUALIFIED';
    };

    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col overflow-y-auto ${
          darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F7FC] text-slate-900'
        }`}
      >
        <header className="bg-[#1E40AF] text-white px-4 sm:px-6 h-14 flex items-center justify-between gap-2 shrink-0 sticky top-0 z-20 shadow-md">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold truncate">
              {t(examName, lang)} · {t(test.title, lang)}
            </div>
            <div className="text-[10px] text-blue-100 truncate">
              {t(cbtProfile.patternBadge, lang)} · {t(cbtProfile.markingRuleLabel, lang)}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center bg-blue-950/50 border border-white/20 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
                className="px-2 py-1 text-xs font-bold text-blue-100 hover:text-white"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
                className="px-2 py-1 text-xs font-bold text-blue-100 hover:text-white"
              >
                A+
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"
              aria-label="Toggle Night Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex items-center bg-blue-950/50 border border-white/20 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onToggleLang('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md ${
                  lang === 'en' ? 'bg-white text-[#1E40AF]' : 'text-blue-100'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('hi')}
                className={`px-2 py-1 text-xs font-semibold rounded-md ${
                  lang === 'hi' ? 'bg-white text-[#1E40AF]' : 'text-blue-100'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5">
          {/* Action Banner */}
          <div
            className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
            }`}
          >
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#2563EB]">
                <ShieldCheck className="w-4 h-4" />
                {lang === 'hi'
                  ? '2026–2027 वास्तविक परीक्षा विश्लेषण एवं कटऑफ रिपोर्ट'
                  : '2026–2027 Real Exam Analytics & Cutoff Predictor'}
              </span>
              <h1 className="mt-1 text-xl sm:text-2xl font-extrabold">
                {t(UI_COPY.result.heading, lang)}
              </h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {t(cbtProfile.markingRuleLabel, lang)} ·{' '}
                {lang === 'hi' ? 'लिया गया समय' : 'Time Taken'}:{' '}
                <strong className="font-mono-num">{formatSecondsMMSS(submittedResult.timeTakenSeconds)}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRetakeInEngine}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[42px] ${
                  darkMode
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t(UI_COPY.result.retake, lang)}</span>
              </button>
              <button
                type="button"
                onClick={() => onComplete(submittedResult)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition min-h-[42px] shadow-xs"
              >
                <span>
                  {lang === 'hi' ? 'सेव करें व डैशबोर्ड पर जाएं' : 'Save & Open Dashboard'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Signature KPI Cards: Expected AIR, Percentile, Normalized Score, Raw Score */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-[#0F296D] to-[#1E40AF] text-white rounded-2xl p-4 sm:p-5 shadow-md">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-100">
                <span>{lang === 'hi' ? 'अपेक्षित अखिल भारतीय रैंक' : 'Expected All-India Rank'}</span>
                <Award className="w-4 h-4 text-amber-300" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono-num text-amber-300">
                #{realAnalytics.expectedAir.toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-[11px] text-blue-100 font-mono-num">
                {lang === 'hi' ? 'कुल अभ्यर्थी:' : 'Out of'}{' '}
                {realAnalytics.totalCandidates.toLocaleString('en-IN')}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>{lang === 'hi' ? 'पर्सेंटाइल स्कोर' : 'Percentile'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono-num text-emerald-600">
                {realAnalytics.percentile}%
              </div>
              <div className={`mt-1 text-[11px] font-mono-num ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t(UI_COPY.result.accuracy, lang)}: {submittedResult.accuracy}%
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>{lang === 'hi' ? 'नॉर्मलाइज्ड स्कोर' : 'Normalized Score'}</span>
                <Target className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono-num">
                {realAnalytics.normalizedScore}
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {' '}
                  / {realAnalytics.normalizedScaleMax}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-emerald-600 font-semibold font-mono-num">
                {lang === 'hi' ? 'शिफ्ट नॉर्मलाइजेशन' : 'Shift Bonus'}: +
                {realAnalytics.normalizationShiftDelta}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>{lang === 'hi' ? 'कुल प्राप्तांक (Raw)' : 'Raw Score'}</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold font-mono-num">
                {submittedResult.score}
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {' '}
                  / {submittedResult.maxScore}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-red-500 font-semibold font-mono-num">
                {lang === 'hi' ? 'नकारात्मक कटौती' : 'Negative Deducted'}: -
                {submittedResult.negativeMarksDeducted}
              </div>
            </div>
          </div>

          {/* 2026–2027 Category Cutoff Status Predictor (General / OBC / EWS / SC / ST) */}
          <div
            className={`rounded-2xl border p-5 shadow-xs ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/70">
              <div>
                <h2 className="text-base font-extrabold">
                  {lang === 'hi'
                    ? '2026–2027 श्रेणीवार अपेक्षित कटऑफ स्थिति'
                    : '2026–2027 Category Cutoff Status'}
                </h2>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'hi'
                    ? `नॉर्मलाइज्ड स्कोर (${realAnalytics.normalizedScore}%) के आधार पर सभी श्रेणियों की पात्रता`
                    : `Eligibility across categories based on Normalized Score (${realAnalytics.normalizedScore}%)`}
                </p>
              </div>
              <span
                className={`self-start px-3 py-1 rounded-lg border text-xs font-extrabold ${
                  realAnalytics.highestCategoryQualified === 'general'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : realAnalytics.highestCategoryQualified
                      ? 'bg-blue-50 border-blue-300 text-[#1E40AF]'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {realAnalytics.highestCategoryQualified === 'general'
                  ? lang === 'hi'
                    ? 'सेफ ज़ोन • सभी श्रेणियों (UR सहित) के लिए योग्य'
                    : 'Safe Zone • Qualified for All Categories (incl. UR)'
                  : realAnalytics.highestCategoryQualified
                    ? lang === 'hi'
                      ? `योग्य (${realAnalytics.highestCategoryQualified.toUpperCase()} व आरक्षित श्रेणी)`
                      : `Qualified (${realAnalytics.highestCategoryQualified.toUpperCase()} & Reserved)`
                    : lang === 'hi'
                      ? 'कटऑफ से नीचे — और अभ्यास आवश्यक'
                      : 'Below Expected Cutoff — Keep Practicing'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {realAnalytics.categoryCutoffs.map((cat) => (
                <div
                  key={cat.category}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2 ${statusBadgeClass(
                    cat.status,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold">{t(cat.label, lang)}</span>
                    <span className="text-[10px] font-mono-num font-bold">
                      {cat.cutoffPercent}%
                    </span>
                  </div>
                  <div className="text-xs font-mono-num opacity-90">
                    {lang === 'hi' ? 'कटऑफ:' : 'Cutoff:'}{' '}
                    <strong>
                      {cat.cutoffMarks} / {submittedResult.maxScore}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-current/15 text-[10px] font-extrabold">
                    <span>{statusLabel(cat.status)}</span>
                    <span className="font-mono-num">
                      {cat.deltaMarks >= 0 ? `+${cat.deltaMarks}%` : `${cat.deltaMarks}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section-Wise Accuracy & Performance Table */}
          <div
            className={`rounded-2xl border overflow-hidden shadow-xs ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`px-5 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h2 className="text-base font-bold">{t(UI_COPY.result.sectionBreakdown, lang)}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead
                  className={`text-xs font-semibold border-b ${
                    darkMode
                      ? 'bg-slate-950 text-slate-400 border-slate-800'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="px-5 py-3">{lang === 'hi' ? 'अनुभाग' : 'Section'}</th>
                    <th className="px-4 py-3 text-right">{lang === 'hi' ? 'कुल' : 'Total'}</th>
                    <th className="px-4 py-3 text-right">{t(UI_COPY.result.correct, lang)}</th>
                    <th className="px-4 py-3 text-right">{t(UI_COPY.result.wrong, lang)}</th>
                    <th className="px-4 py-3 text-right">{t(UI_COPY.result.skipped, lang)}</th>
                    <th className="px-4 py-3 text-right">{t(UI_COPY.result.accuracy, lang)}</th>
                    <th className="px-5 py-3 text-right">{t(UI_COPY.result.score, lang)}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {submittedResult.sectionBreakdown.map((sec) => (
                    <tr key={sec.section.en}>
                      <td className="px-5 py-3.5 font-medium">{t(sec.section, lang)}</td>
                      <td className="px-4 py-3.5 text-right font-mono-num">{sec.total}</td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-emerald-600 font-semibold">
                        {sec.correct}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-red-500 font-semibold">
                        {sec.wrong}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num opacity-70">{sec.skipped}</td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-semibold">
                        {sec.accuracy}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-num font-bold">
                        {sec.score} / {sec.maxScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bilingual Step-by-Step Solutions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{t(UI_COPY.result.solutionsHeading, lang)}</h2>
              <div
                className={`inline-flex items-center gap-1 p-1 rounded-lg self-start ${
                  darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200/70'
                }`}
              >
                {(
                  [
                    {id: 'all', label: UI_COPY.result.all, count: submittedResult.totalQuestions},
                    {id: 'correct', label: UI_COPY.result.correct, count: submittedResult.correctCount},
                    {id: 'wrong', label: UI_COPY.result.wrong, count: submittedResult.wrongCount},
                    {id: 'skipped', label: UI_COPY.result.skipped, count: submittedResult.skippedCount},
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSolutionFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                      solutionFilter === tab.id
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : darkMode
                          ? 'text-slate-300 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t(tab.label, lang)} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredSolutionDetails.map((detail) => {
                const q = detail.question;
                const globalIndex = submittedResult.details.findIndex(
                  (x) => x.question.id === q.id,
                );
                const isBookmarked = bookmarkedIds.has(q.id);
                const syllabusMeta = getQuestionSyllabusMeta(q, test.examId);

                return (
                  <div
                    key={q.id}
                    className={`border rounded-xl p-5 sm:p-6 shadow-xs ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
                        darkMode ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold font-mono-num">Q.{globalIndex + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t(q.section, lang)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#2563EB]">{q.type}</span>
                        <span aria-hidden="true">·</span>
                        {detail.status === 'correct' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t(UI_COPY.result.correct, lang)} (+{detail.marksAwarded})
                          </span>
                        )}
                        {detail.status === 'wrong' && (
                          <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            {t(UI_COPY.result.wrong, lang)} ({detail.marksAwarded})
                          </span>
                        )}
                        {detail.status === 'skipped' && (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-semibold">
                            <MinusCircle className="w-3.5 h-3.5" />
                            {t(UI_COPY.result.skipped, lang)} (0)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleBookmark(q)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          isBookmarked
                            ? 'bg-blue-50 border-[#2563EB] text-[#1E40AF]'
                            : darkMode
                              ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                        <span>
                          {isBookmarked
                            ? lang === 'hi'
                              ? 'सेव्ड'
                              : 'Saved'
                            : lang === 'hi'
                              ? 'सेव करें'
                              : 'Save'}
                        </span>
                      </button>
                    </div>

                    <div className="mt-2.5 text-[11px] font-semibold text-[#2563EB]">
                      {t(syllabusMeta.patternTag, lang)} • {t(syllabusMeta.topicTag, lang)} •{' '}
                      {t(syllabusMeta.sourceTag, lang)}
                    </div>

                    <p className={`mt-2.5 font-medium leading-relaxed ${zoom.stem}`}>
                      {t(q.question, lang)}
                    </p>

                    {q.options && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, idx) => {
                          const expectedList = Array.isArray(q.correctAnswer)
                            ? q.correctAnswer
                            : [q.correctAnswer];
                          const userList = Array.isArray(detail.userResponse)
                            ? detail.userResponse
                            : detail.userResponse
                              ? [detail.userResponse]
                              : [];
                          const isExpected = expectedList.includes(opt.id);
                          const isPicked = userList.includes(opt.id);

                          let boxClass = darkMode
                            ? 'border-slate-800 bg-slate-950/60 text-slate-300'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700';
                          if (isExpected) {
                            boxClass = darkMode
                              ? 'border-emerald-600 bg-emerald-950/60 text-emerald-200 font-medium'
                              : 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                          } else if (isPicked && !isExpected) {
                            boxClass = darkMode
                              ? 'border-red-700 bg-red-950/60 text-red-200'
                              : 'border-red-400 bg-red-50 text-red-900';
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${zoom.option} ${boxClass}`}
                            >
                              <span className="font-bold font-mono-num">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <span>{t(opt.text, lang)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm">
                      <div>
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                          {t(UI_COPY.result.yourAnswer, lang)}:{' '}
                        </span>
                        <strong className="font-mono-num">{formatUserAns(q, detail.userResponse)}</strong>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                          {t(UI_COPY.result.correctAnswer, lang)}:{' '}
                        </span>
                        <strong className="font-mono-num text-emerald-600">
                          {formatExpectedAns(q)}
                        </strong>
                      </div>
                    </div>

                    <div
                      className={`mt-3 rounded-lg border p-3.5 text-xs sm:text-sm leading-relaxed ${
                        darkMode
                          ? 'bg-blue-950/30 border-blue-900/60 text-slate-200'
                          : 'bg-blue-50/60 border-blue-100 text-slate-700'
                      }`}
                    >
                      <span className="font-bold text-[#2563EB]">
                        {t(UI_COPY.result.explanation, lang)}:{' '}
                      </span>
                      {t(q.explanation, lang)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STAGE 2: ACTIVE CBT TESTING WORKSPACE ---
  if (!currentQuestion) {
    return null;
  }

  const effectiveTimerForAlert = cbtProfile.isSectionLocked ? sectionTimeLeft : timeLeft;
  const isTimerWarning = effectiveTimerForAlert <= 300 && effectiveTimerForAlert > 60;
  const isTimerDanger = effectiveTimerForAlert <= 60;
  const isBookmarked = bookmarkedIds.has(currentQuestion.id);
  const syllabusMeta = getQuestionSyllabusMeta(currentQuestion, test.examId);
  const effectiveQNeg =
    currentQuestion.type === 'NAT' ? 0 : cbtProfile.effectiveNegativeMark;
  const activePosInSection = activeSectionQuestionIndices.indexOf(currentIndex);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* CBT Top Bar */}
      <header className="bg-[#1E40AF] text-white px-2.5 sm:px-5 h-14 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePauseAndExit}
            title={t(UI_COPY.cbt.pauseExit, lang)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold whitespace-nowrap shrink-0 min-h-[36px]"
          >
            <PauseCircle className="w-4 h-4" />
            <span className="hidden md:inline">{t(UI_COPY.cbt.pauseExit, lang)}</span>
          </button>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold truncate">
              {t(examName, lang)} · {t(test.title, lang)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Virtual Scientific Calculator Toggle for GATE / SSC JE / RRB JE */}
          {cbtProfile.hasScientificCalculator && (
            <button
              type="button"
              onClick={() => setShowCalculator((c) => !c)}
              title={lang === 'hi' ? 'वैज्ञानिक कैलकुलेटर' : 'Scientific Calculator'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition min-h-[36px] ${
                showCalculator
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'hi' ? 'कैलकुलेटर' : 'Calc'}</span>
            </button>
          )}

          {/* Font Zoom A- / A+ */}
          <div className="hidden sm:flex items-center bg-blue-950/50 border border-white/20 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
              disabled={zoomIndex === 0}
              aria-label="Decrease font size"
              className="px-1.5 py-1 text-[11px] font-bold text-blue-100 hover:text-white disabled:opacity-40"
            >
              A-
            </button>
            <span className="px-1 text-[10px] font-mono-num text-amber-200">{zoom.label}</span>
            <button
              type="button"
              onClick={() => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              aria-label="Increase font size"
              className="px-1.5 py-1 text-[11px] font-bold text-blue-100 hover:text-white disabled:opacity-40"
            >
              A+
            </button>
          </div>

          {/* Night Mode Toggle */}
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? 'Light Reading Mode' : 'Night Reading Mode'}
            title={darkMode ? 'Light Mode' : 'Night Mode'}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Countdown Timer (Section Timer + Total Timer when locked) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-mono-num text-xs sm:text-sm font-semibold ${
              isTimerDanger
                ? 'bg-red-600 text-white'
                : isTimerWarning
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-blue-950/60 text-white border border-white/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {cbtProfile.isSectionLocked ? (
              <span>
                {lang === 'hi' ? 'सेक्शन' : 'Sec'}: {formatSecondsMMSS(sectionTimeLeft)}
              </span>
            ) : (
              <span>{formatSecondsMMSS(timeLeft)}</span>
            )}
          </div>

          {/* Mid-test EN/HI Switch */}
          <div className="flex items-center bg-blue-950/50 border border-white/20 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`px-2 py-1 text-xs font-semibold rounded-md ${
                lang === 'en' ? 'bg-white text-[#1E40AF]' : 'text-blue-100'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('hi')}
              className={`px-2 py-1 text-xs font-semibold rounded-md ${
                lang === 'hi' ? 'bg-white text-[#1E40AF]' : 'text-blue-100'
              }`}
            >
              हिंदी
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={
              isFullscreen
                ? t(UI_COPY.cbt.exitFullscreen, lang)
                : t(UI_COPY.cbt.fullscreen, lang)
            }
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowPaletteMobile(true)}
            className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold min-h-[36px]"
          >
            <Grid className="w-4 h-4" />
            <span className="font-mono-num">
              {currentIndex + 1}/{questions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition min-h-[36px]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t(UI_COPY.cbt.submitTest, lang)}</span>
          </button>
        </div>
      </header>

      {/* Floating Virtual Scientific Calculator */}
      {showCalculator && cbtProfile.hasScientificCalculator && (
        <ScientificCalculatorPanel
          lang={lang}
          darkMode={darkMode}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* Section Tabs (Free Navigation or Locked Sectional Timers) */}
      <div
        className={`border-b px-3 sm:px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-x-auto">
          {sections.map((sec, sIdx) => {
            const isCurrentSec = cbtProfile.isSectionLocked
              ? sIdx === activeSectionIndex
              : currentQuestion.section.en === sec.en;
            const isLockedTab = cbtProfile.isSectionLocked && sIdx !== activeSectionIndex;

            return (
              <button
                key={sec.en}
                type="button"
                onClick={() => handleSectionJump(sec.en, sIdx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  isCurrentSec
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : isLockedTab
                      ? darkMode
                        ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : darkMode
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isLockedTab && <Lock className="w-3 h-3 shrink-0" />}
                <span>
                  {t(sec, lang)}{' '}
                  <span className="opacity-80 font-mono-num">
                    ({sectionQuestionCounts[sec.en] ?? 0})
                  </span>
                </span>
                {cbtProfile.isSectionLocked && isCurrentSec && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono-num">
                    {formatSecondsMMSS(sectionTimeLeft)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Zoom Controls */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
            className={`px-2 py-1 rounded border text-[11px] font-bold ${
              darkMode ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-700'
            }`}
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
            className={`px-2 py-1 rounded border text-[11px] font-bold ${
              darkMode ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-700'
            }`}
          >
            A+
          </button>
        </div>
      </div>

      {/* Inline Section Lock Toast Notice */}
      {lockNotice && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold text-center shrink-0">
          {lockNotice}
        </div>
      )}

      {/* Main Split Workspace: Question Canvas + TCS iON Palette */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div
              className={`max-w-3xl mx-auto border rounded-xl p-5 sm:p-7 shadow-xs ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* 2026–2027 Syllabus & Section Weightage Tag */}
              <div
                className={`mb-3 px-3 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold ${
                  darkMode
                    ? 'bg-blue-950/40 border-blue-900/70 text-blue-200'
                    : 'bg-blue-50/70 border-blue-100 text-[#1E40AF]'
                }`}
              >
                <span>
                  {t(syllabusMeta.patternTag, lang)} • {t(syllabusMeta.topicTag, lang)} •{' '}
                  {t(syllabusMeta.sourceTag, lang)}
                </span>
                <span className="font-mono-num">{t(syllabusMeta.weightageLabel, lang)}</span>
              </div>

              {/* Question Header Metadata */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 pb-4 border-b ${
                  darkMode ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div
                  className={`flex flex-wrap items-center gap-2 text-xs sm:text-sm ${
                    darkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`font-bold font-mono-num ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {t(UI_COPY.cbt.questionNo, lang)} {currentIndex + 1} / {questions.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#2563EB]">{currentQuestion.type}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num text-emerald-600 font-medium">
                    +{currentQuestion.marks}
                  </span>
                  <span aria-hidden="true">/</span>
                  <span className="font-mono-num text-red-500 font-medium">
                    -{effectiveQNeg}
                  </span>
                  {currentQuestion.isSampleDevData && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-600 font-semibold">Sample Dev Data</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(currentQuestion)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition min-h-[36px] ${
                    isBookmarked
                      ? 'bg-blue-50 border-[#2563EB] text-[#1E40AF]'
                      : darkMode
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>
                    {isBookmarked
                      ? lang === 'hi'
                        ? 'सेव्ड'
                        : 'Saved'
                      : lang === 'hi'
                        ? 'सेव करें'
                        : 'Save'}
                  </span>
                </button>
              </div>

              {/* Question Stem (with Zoom + Night Mode) */}
              <div className={`mt-5 font-medium leading-relaxed ${zoom.stem}`}>
                {t(currentQuestion.question, lang)}
              </div>

              {/* Question Input Mode: MCQ / MSQ / NAT */}
              <div className="mt-6">
                {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                  <div className="space-y-3" role="radiogroup" aria-label="Options">
                    {currentQuestion.options.map((opt, idx) => {
                      const selected = responses[currentQuestion.id] === opt.id;
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectMCQ(currentQuestion.id, opt.id)}
                          className={`w-full text-left flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition min-h-[52px] ${
                            selected
                              ? darkMode
                                ? 'border-blue-500 bg-blue-950/60 ring-1 ring-blue-500'
                                : 'border-[#2563EB] bg-blue-50/70 ring-1 ring-[#2563EB]'
                              : darkMode
                                ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/70'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              selected
                                ? 'bg-[#2563EB] text-white'
                                : darkMode
                                  ? 'bg-slate-800 text-slate-200 border border-slate-600'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className={`${zoom.option} leading-snug pt-0.5`}>
                            {t(opt.text, lang)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'MSQ' && currentQuestion.options && (
                  <div>
                    <p className="text-xs font-semibold text-[#2563EB] mb-3">
                      {t(UI_COPY.cbt.msqHint, lang)}
                    </p>
                    <div className="space-y-3" role="group" aria-label="Multi-select options">
                      {currentQuestion.options.map((opt, idx) => {
                        const selectedList = Array.isArray(responses[currentQuestion.id])
                          ? (responses[currentQuestion.id] as string[])
                          : [];
                        const selected = selectedList.includes(opt.id);
                        const letter = String.fromCharCode(65 + idx);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleToggleMSQ(currentQuestion.id, opt.id)}
                            className={`w-full text-left flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition min-h-[52px] ${
                              selected
                                ? darkMode
                                  ? 'border-blue-500 bg-blue-950/60 ring-1 ring-blue-500'
                                  : 'border-[#2563EB] bg-blue-50/70 ring-1 ring-[#2563EB]'
                                : darkMode
                                  ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/70'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                                selected
                                  ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                  : darkMode
                                    ? 'bg-slate-800 border-slate-600 text-slate-200'
                                    : 'bg-white border-slate-300 text-slate-600'
                              }`}
                            >
                              {selected ? <Check className="w-4 h-4" /> : letter}
                            </span>
                            <span className={`${zoom.option} leading-snug pt-0.5`}>
                              {t(opt.text, lang)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentQuestion.type === 'NAT' && (
                  <div className="max-w-xs">
                    <p className="text-xs font-semibold text-[#2563EB] mb-2">
                      {t(UI_COPY.cbt.natHint, lang)}
                    </p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        typeof responses[currentQuestion.id] === 'string'
                          ? (responses[currentQuestion.id] as string)
                          : ''
                      }
                      onChange={(e) => handleNATInput(currentQuestion.id, e.target.value)}
                      placeholder={lang === 'hi' ? 'संख्या दर्ज करें...' : 'Enter numeric value...'}
                      className={`w-full h-12 px-4 rounded-xl border-2 focus:border-[#2563EB] focus:outline-none text-lg font-mono-num font-bold ${
                        darkMode
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />

                    {/* Numeric Keypad */}
                    <div
                      className={`mt-3 grid grid-cols-3 gap-2 p-3 rounded-xl border ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleKeypadPress(k)}
                          className={`h-11 rounded-lg border hover:border-[#2563EB] active:scale-[0.98] font-mono-num text-base font-bold transition shadow-2xs ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                              : 'bg-white border-slate-200 text-slate-900 hover:bg-blue-50'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('BACK')}
                        className={`h-11 rounded-lg border flex items-center justify-center font-semibold text-sm ${
                          darkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                        aria-label="Backspace"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('CLEAR')}
                        className={`col-span-2 h-11 rounded-lg font-semibold text-xs sm:text-sm transition ${
                          darkMode
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                      >
                        {t(UI_COPY.cbt.clearResponse, lang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CBT Action Footer */}
          <footer
            className={`border-t px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAndNext}
                className="px-3 py-2 rounded-lg border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs sm:text-sm font-semibold transition min-h-[40px] whitespace-nowrap"
              >
                {t(UI_COPY.cbt.markReviewNext, lang)}
              </button>
              <button
                type="button"
                onClick={handleClearResponse}
                className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold transition min-h-[40px] whitespace-nowrap ${
                  darkMode
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t(UI_COPY.cbt.clearResponse, lang)}
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={activePosInSection <= 0}
                onClick={goToPrevAllowedQuestion}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg border disabled:opacity-40 text-xs sm:text-sm font-semibold transition min-h-[40px] ${
                  darkMode
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t(UI_COPY.cbt.previous, lang)}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition min-h-[40px] whitespace-nowrap"
              >
                <span>{t(UI_COPY.cbt.saveNext, lang)}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="sm:hidden px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold min-h-[40px]"
              >
                {t(UI_COPY.cbt.submitTest, lang)}
              </button>
            </div>
          </footer>
        </div>

        {/* Desktop TCS iON Question Palette */}
        <aside
          className={`hidden lg:flex w-80 border-l flex-col shrink-0 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">
                {t(UI_COPY.cbt.paletteTitle, lang)}{' '}
                <span className="text-xs font-mono-num text-[#2563EB]">
                  ({questions.length})
                </span>
              </h2>
              {cbtProfile.isSectionLocked && (
                <span className="text-[10px] font-bold text-amber-600 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {lang === 'hi' ? 'सेक्शन लॉक' : 'Locked Mode'}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-mono-num font-bold">
                  {stats.answered}
                </span>
                <span>{t(UI_COPY.cbt.answered, lang)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center font-mono-num font-bold">
                  {stats.notAnswered}
                </span>
                <span>{t(UI_COPY.cbt.notAnswered, lang)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-violet-600 text-white flex items-center justify-center font-mono-num font-bold">
                  {stats.markedCount}
                </span>
                <span>{t(UI_COPY.cbt.marked, lang)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center font-mono-num font-bold">
                  {stats.notVisited}
                </span>
                <span>{t(UI_COPY.cbt.notVisited, lang)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const hasAns = !isResponseEmpty(responses[q.id]);
                const isMarked = !!marked[q.id];
                const locked = !isQuestionInActiveSection(q);

                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setCurrentIndex(idx)}
                    className={`relative h-10 rounded-lg border text-xs font-mono-num font-bold transition ${getPaletteStatusClass(
                      q,
                      isCurrent,
                      locked,
                    )}`}
                  >
                    {idx + 1}
                    {isMarked && hasAns && !locked && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`p-4 border-t ${
              darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
            >
              {t(UI_COPY.cbt.submitTest, lang)}
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Question Palette Drawer */}
      {showPaletteMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 flex justify-end">
          <div
            className={`w-80 max-w-[85vw] h-full flex flex-col shadow-xl ${
              darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <h2 className="text-sm font-bold">
                {t(UI_COPY.cbt.paletteTitle, lang)}{' '}
                <span className="text-xs font-mono-num text-[#2563EB]">
                  ({questions.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowPaletteMobile(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className={`p-4 border-b grid grid-cols-2 gap-2 text-xs ${
                darkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-mono-num font-bold">
                  {stats.answered}
                </span>
                <span>{t(UI_COPY.cbt.answered, lang)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center font-mono-num font-bold">
                  {stats.notAnswered}
                </span>
                <span>{t(UI_COPY.cbt.notAnswered, lang)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-violet-600 text-white flex items-center justify-center font-mono-num font-bold">
                  {stats.markedCount}
                </span>
                <span>{t(UI_COPY.cbt.marked, lang)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center font-mono-num font-bold">
                  {stats.notVisited}
                </span>
                <span>{t(UI_COPY.cbt.notVisited, lang)}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, idx) => {
                  const locked = !isQuestionInActiveSection(q);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (!locked) {
                          setCurrentIndex(idx);
                          setShowPaletteMobile(false);
                        }
                      }}
                      className={`h-10 rounded-lg border text-xs font-mono-num font-bold ${getPaletteStatusClass(
                        q,
                        idx === currentIndex,
                        locked,
                      )}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  setShowPaletteMobile(false);
                  setShowSubmitModal(true);
                }}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
              >
                {t(UI_COPY.cbt.submitTest, lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E40AF] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t(UI_COPY.cbt.confirmSubmitTitle, lang)}</h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t(UI_COPY.cbt.confirmSubmitDesc, lang)}
                </p>
              </div>
            </div>

            <div
              className={`mt-5 grid grid-cols-2 gap-3 text-sm border rounded-xl p-4 ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  {t(UI_COPY.cbt.answered, lang)}
                </span>
                <strong className="font-mono-num text-emerald-600">{stats.answered}</strong>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  {t(UI_COPY.cbt.notAnswered, lang)}
                </span>
                <strong className="font-mono-num text-red-500">{stats.notAnswered}</strong>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  {t(UI_COPY.cbt.marked, lang)}
                </span>
                <strong className="font-mono-num text-violet-500">{stats.markedCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  {t(UI_COPY.cbt.notVisited, lang)}
                </span>
                <strong className="font-mono-num">{stats.notVisited}</strong>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold min-h-[42px] ${
                  darkMode
                    ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t(UI_COPY.cbt.cancel, lang)}
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold min-h-[42px]"
              >
                {t(UI_COPY.cbt.confirmSubmitBtn, lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
