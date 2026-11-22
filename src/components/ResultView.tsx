import React, {useMemo, useState} from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  MinusCircle,
  RotateCcw,
  Target,
  TrendingDown,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  AttemptResult,
  Language,
  Question,
  QuestionStatusFilter,
  ResponseValue,
} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';
import {formatSecondsMMSS} from '../utils/scoring';

interface ResultViewProps {
  result: AttemptResult;
  lang: Language;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (q: Question) => void;
  onRetake: () => void;
  onBackDashboard: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  lang,
  bookmarkedIds,
  onToggleBookmark,
  onRetake,
  onBackDashboard,
}) => {
  const [filter, setFilter] = useState<QuestionStatusFilter>('all');

  const filteredDetails = useMemo(() => {
    if (filter === 'all') return result.details;
    return result.details.filter((d) => d.status === filter);
  }, [result.details, filter]);

  const formatUserAnswer = (q: Question, resp: ResponseValue): string => {
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

  const formatCorrectAnswer = (q: Question): string => {
    if (q.type === 'NAT') return String(q.correctAnswer);
    const ids = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
    return ids
      .map((id) => {
        const idx = q.options?.findIndex((o) => o.id === id) ?? -1;
        return idx >= 0 ? String.fromCharCode(65 + idx) : id.toUpperCase();
      })
      .join(', ');
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 animate-fade-in">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-blue-100 rounded-2xl p-5 shadow-xs">
        <div>
          <button
            type="button"
            onClick={onBackDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t(UI_COPY.result.backDashboard, lang)}</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {t(UI_COPY.result.heading, lang)}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t(result.examName, lang)} · {t(result.testTitle, lang)}
          </p>
        </div>

        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold transition shrink-0 min-h-[44px] shadow-2xs"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t(UI_COPY.result.retake, lang)}</span>
        </button>
      </div>

      {/* Deterministic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t(UI_COPY.result.score, lang)}</span>
            <Trophy className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-num">
            {result.score}{' '}
            <span className="text-sm font-medium text-slate-500">/ {result.maxScore}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t(UI_COPY.result.accuracy, lang)}</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-num">
            {result.accuracy}%
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t(UI_COPY.result.negativeDeducted, lang)}</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-red-600 font-mono-num">
            -{result.negativeMarksDeducted}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t(UI_COPY.result.timeTaken, lang)}</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-num">
            {formatSecondsMMSS(result.timeTakenSeconds)}
          </div>
        </div>
      </div>

      {/* Attempt Summary Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center gap-4 sm:gap-8 text-sm shadow-xs">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t(UI_COPY.result.correct, lang)}:</span>
          <span className="font-mono-num">{result.correctCount}</span>
        </div>
        <div className="flex items-center gap-2 text-red-600 font-semibold">
          <XCircle className="w-4 h-4" />
          <span>{t(UI_COPY.result.wrong, lang)}:</span>
          <span className="font-mono-num">{result.wrongCount}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 font-semibold">
          <MinusCircle className="w-4 h-4" />
          <span>{t(UI_COPY.result.skipped, lang)}:</span>
          <span className="font-mono-num">{result.skippedCount}</span>
        </div>
      </div>

      {/* Section-wise Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {t(UI_COPY.result.sectionBreakdown, lang)}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-200">
              {result.sectionBreakdown.map((sec) => (
                <tr key={sec.section.en} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {t(sec.section, lang)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-slate-700">{sec.total}</td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-emerald-700 font-semibold">
                    {sec.correct}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-red-600 font-semibold">
                    {sec.wrong}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-slate-500">
                    {sec.skipped}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-num text-slate-800">
                    {sec.accuracy}%
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-num font-bold text-slate-900">
                    {sec.score} / {sec.maxScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filterable Bilingual Solutions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            {t(UI_COPY.result.solutionsHeading, lang)}
          </h2>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
            {(
              [
                {id: 'all', label: UI_COPY.result.all, count: result.totalQuestions},
                {id: 'correct', label: UI_COPY.result.correct, count: result.correctCount},
                {id: 'wrong', label: UI_COPY.result.wrong, count: result.wrongCount},
                {id: 'skipped', label: UI_COPY.result.skipped, count: result.skippedCount},
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-[#1E40AF] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(tab.label, lang)} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredDetails.map((detail) => {
            const q = detail.question;
            const globalIndex = result.details.findIndex((x) => x.question.id === q.id);
            const isBookmarked = bookmarkedIds.has(q.id);

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-900 font-mono-num">
                      Q.{globalIndex + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t(q.section, lang)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-[#1E40AF]">{q.type}</span>
                    <span aria-hidden="true">·</span>
                    {detail.status === 'correct' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t(UI_COPY.result.correct, lang)} (+{detail.marksAwarded})
                      </span>
                    )}
                    {detail.status === 'wrong' && (
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
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
                    {q.isSampleDevData && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-semibold">Sample Dev Data</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(q)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      isBookmarked
                        ? 'bg-blue-50 border-[#2563EB] text-[#1E40AF]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    <span>{isBookmarked ? (lang === 'hi' ? 'सेव्ड' : 'Saved') : (lang === 'hi' ? 'सेव करें' : 'Save')}</span>
                  </button>
                </div>

                <p className="mt-4 text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
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

                      let boxClass = 'border-slate-200 bg-slate-50/50 text-slate-700';
                      if (isExpected) {
                        boxClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                      } else if (isPicked && !isExpected) {
                        boxClass = 'border-red-400 bg-red-50 text-red-900';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm ${boxClass}`}
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
                    <span className="text-slate-500">{t(UI_COPY.result.yourAnswer, lang)}: </span>
                    <strong className="font-mono-num text-slate-900">
                      {formatUserAnswer(q, detail.userResponse)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">{t(UI_COPY.result.correctAnswer, lang)}: </span>
                    <strong className="font-mono-num text-emerald-700">
                      {formatCorrectAnswer(q)}
                    </strong>
                  </div>
                </div>

                <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-lg p-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-[#1E40AF]">{t(UI_COPY.result.explanation, lang)}: </span>
                  {t(q.explanation, lang)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
