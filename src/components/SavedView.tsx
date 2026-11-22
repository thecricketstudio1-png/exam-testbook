import React, {useState} from 'react';
import {Bookmark, ChevronDown, ChevronUp, Trash2} from 'lucide-react';
import {BookmarkItem, Language, Question} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';

interface SavedViewProps {
  lang: Language;
  bookmarks: BookmarkItem[];
  onToggleBookmark: (q: Question) => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  lang,
  bookmarks,
  onToggleBookmark,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          {t(UI_COPY.saved.heading, lang)}
        </h1>
        <span className="px-3 py-1 rounded-xl bg-[#EFF6FF] text-sm font-mono-num font-bold text-[#1E40AF]">
          {bookmarks.length}
        </span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <p className="mt-4 text-sm text-slate-600 max-w-md mx-auto">
            {t(UI_COPY.saved.empty, lang)}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {bookmarks.map((item) => {
            const q = item.question;
            const isOpen = expandedIds.has(q.id);
            const correctDisplay = Array.isArray(q.correctAnswer)
              ? q.correctAnswer.map((id) => id.toUpperCase()).join(', ')
              : q.type === 'NAT'
                ? q.correctAnswer
                : q.correctAnswer.toUpperCase();

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#1E40AF]">{t(q.section, lang)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.type}</span>
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
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t(UI_COPY.saved.remove, lang)}</span>
                  </button>
                </div>

                <p className="mt-3 text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                  {t(q.question, lang)}
                </p>

                {q.options && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <strong className="font-mono-num">{String.fromCharCode(65 + idx)}.</strong>{' '}
                        {t(opt.text, lang)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => toggleExpand(q.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>{t(UI_COPY.saved.hideAnswer, lang)}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>{t(UI_COPY.saved.showAnswer, lang)}</span>
                      </>
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-3 bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 text-xs sm:text-sm text-slate-700 space-y-1.5">
                      <div>
                        <strong className="text-emerald-700">
                          {t(UI_COPY.result.correctAnswer, lang)}:{' '}
                        </strong>
                        <span className="font-mono-num font-bold text-slate-900">
                          {correctDisplay}
                        </span>
                      </div>
                      <div>
                        <strong className="text-[#1E40AF]">
                          {t(UI_COPY.result.explanation, lang)}:{' '}
                        </strong>
                        {t(q.explanation, lang)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
