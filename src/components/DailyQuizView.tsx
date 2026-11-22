import React, {useState} from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import {Language, Question} from '../types/exam';
import {DAILY_QUIZ_QUESTIONS} from '../data/questions';
import {t, UI_COPY} from '../data/i18n';

interface DailyQuizViewProps {
  lang: Language;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (q: Question) => void;
}

export const DailyQuizView: React.FC<DailyQuizViewProps> = ({
  lang,
  bookmarkedIds,
  onToggleBookmark,
}) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = DAILY_QUIZ_QUESTIONS;
  const current = questions[index];

  const handleCheck = () => {
    if (!selected || revealed) return;
    setRevealed(true);
    if (selected === current.correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1E40AF] flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {t(UI_COPY.quiz.completedTitle, lang)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {lang === 'hi'
              ? `आपने ${questions.length} में से ${score} प्रश्नों के सही उत्तर दिए (${accuracy}% सटीकता)।`
              : `You answered ${score} out of ${questions.length} questions correctly (${accuracy}% accuracy).`}
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 font-mono-num">
            <div>
              <div className="text-xs text-slate-500">{t(UI_COPY.result.score, lang)}</div>
              <div className="text-2xl font-extrabold text-[#1E40AF]">
                {score} / {questions.length}
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div>
              <div className="text-xs text-slate-500">{t(UI_COPY.result.accuracy, lang)}</div>
              <div className="text-2xl font-extrabold text-emerald-700">{accuracy}%</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRestart}
            className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t(UI_COPY.quiz.restartQuiz, lang)}</span>
          </button>
        </div>
      </div>
    );
  }

  const isBookmarked = bookmarkedIds.has(current.id);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 animate-fade-in">
      <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          {t(UI_COPY.quiz.heading, lang)}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          {t(UI_COPY.quiz.subtitle, lang)}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
          <span className="font-mono-num">
            {t(UI_COPY.cbt.questionNo, lang)} {index + 1} / {questions.length}
          </span>
          <span className="font-mono-num text-[#1E40AF]">
            {t(UI_COPY.result.score, lang)}: {score}
          </span>
        </div>
        <div className="h-2.5 w-full bg-[#EFF6FF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
            style={{width: `${((index + 1) / questions.length) * 100}%`}}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-[#1E40AF]">{t(current.section, lang)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-700 font-semibold">Sample Dev Data</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleBookmark(current)}
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

        <h2 className="mt-4 text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
          {t(current.question, lang)}
        </h2>

        <div className="mt-5 space-y-2.5">
          {current.options?.map((opt, idx) => {
            const isSelected = selected === opt.id;
            const isCorrect = opt.id === current.correctAnswer;
            const letter = String.fromCharCode(65 + idx);

            let cardStyle = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50';
            if (revealed) {
              if (isCorrect) {
                cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900';
              } else if (isSelected && !isCorrect) {
                cardStyle = 'border-red-400 bg-red-50 text-red-900';
              }
            } else if (isSelected) {
              cardStyle = 'border-[#2563EB] bg-blue-50/70 ring-1 ring-[#2563EB]';
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={revealed}
                onClick={() => setSelected(opt.id)}
                className={`w-full text-left flex items-center justify-between gap-3 p-3.5 rounded-xl border transition min-h-[48px] ${cardStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base">{t(opt.text, lang)}</span>
                </div>
                {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {revealed && isSelected && !isCorrect && (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-5 bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <strong className="text-[#1E40AF]">{t(UI_COPY.result.explanation, lang)}: </strong>
            {t(current.explanation, lang)}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!revealed ? (
            <button
              type="button"
              disabled={!selected}
              onClick={handleCheck}
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition min-h-[44px]"
            >
              {t(UI_COPY.quiz.checkAnswer, lang)}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition min-h-[44px]"
            >
              <span>
                {index < questions.length - 1
                  ? t(UI_COPY.quiz.nextQuestion, lang)
                  : t(UI_COPY.quiz.finishQuiz, lang)}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
