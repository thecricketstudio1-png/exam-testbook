import React, {useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileJson,
  Image,
  Lock,
  Moon,
  Play,
  RotateCcw,
  ShieldCheck,
  Sun,
  Upload,
} from 'lucide-react';
import type {Language, Question} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';
import {
  type BannerSlotId,
  type BannerTextTheme,
  type CustomBannersState,
  DEFAULT_BANNERS_STATE,
  saveCustomBanners,
} from '../utils/banners';

interface DashboardAdminPanelsProps {
  lang: Language;
  adminEmail: string;
  isAuthorizedAdminEmail: boolean;
  customQuestions: Question[];
  onSaveCustomQuestions: (questions: Question[]) => void;
  onLaunchCustomTest: (questions: Question[]) => void;
  banners: CustomBannersState;
  onBannersChange: (next: CustomBannersState) => void;
  onLockAdmin: () => void;
}

const SAMPLE_IMPORT_TEMPLATE: Question[] = [
  {
    id: 'admin-q1',
    section: {en: 'General Awareness', hi: 'सामान्य जागरूकता'},
    type: 'MCQ',
    marks: 2,
    negativeMark: 0.5,
    question: {
      en: 'Who was the Chairman of the Drafting Committee of the Indian Constitution?',
      hi: 'भारतीय संविधान की प्रारूप समिति के अध्यक्ष कौन थे?',
    },
    options: [
      {id: 'a', text: {en: 'Dr. Rajendra Prasad', hi: 'डॉ. राजेंद्र प्रसाद'}},
      {id: 'b', text: {en: 'Dr. B. R. Ambedkar', hi: 'डॉ. बी. आर. अम्बेडकर'}},
      {id: 'c', text: {en: 'Jawaharlal Nehru', hi: 'जवाहरलाल नेहरू'}},
      {id: 'd', text: {en: 'Sardar Patel', hi: 'सरदार पटेल'}},
    ],
    correctAnswer: 'b',
    explanation: {
      en: 'Dr. B. R. Ambedkar served as Chairman of the 7-member Drafting Committee formed on 29 August 1947.',
      hi: 'डॉ. बी. आर. अम्बेडकर 29 अगस्त 1947 को गठित 7-सदस्यीय प्रारूप समिति के अध्यक्ष थे।',
    },
  },
  {
    id: 'admin-q2',
    section: {en: 'Quantitative Aptitude', hi: 'मात्रात्मक योग्यता'},
    type: 'NAT',
    marks: 2,
    negativeMark: 0,
    question: {
      en: 'What is the value of 15% of 400?',
      hi: '400 का 15% कितना होता है?',
    },
    correctAnswer: '60',
    explanation: {
      en: '15% of 400 = (15 / 100) × 400 = 60.',
      hi: '400 का 15% = (15 / 100) × 400 = 60।',
    },
  },
];

async function readImageFileAsDataUrl(file: File): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });

  if (rawUrl.length <= 450_000) {
    return rawUrl;
  }

  // Downscale large gallery photos cleanly so localStorage persists reliably
  return new Promise<string>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const maxWidth = 1440;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(rawUrl);
    img.src = rawUrl;
  });
}

function validateImportedQuestions(raw: unknown): {
  valid: Question[];
  error: string | null;
} {
  if (!Array.isArray(raw)) {
    return {valid: [], error: 'Root JSON must be an array of question objects.'};
  }
  if (raw.length === 0) {
    return {valid: [], error: 'JSON array cannot be empty.'};
  }

  const parsed: Question[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') {
      return {valid: [], error: `Item at index ${i} is not an object.`};
    }
    const type = item.type;
    if (type !== 'MCQ' && type !== 'MSQ' && type !== 'NAT') {
      return {valid: [], error: `Item ${i + 1}: "type" must be MCQ, MSQ, or NAT.`};
    }
    const qObj = item.question as {en?: string; hi?: string} | undefined;
    if (!qObj || typeof qObj.en !== 'string' || typeof qObj.hi !== 'string') {
      return {valid: [], error: `Item ${i + 1}: "question" must have "en" and "hi" strings.`};
    }
    const secObj = item.section as {en?: string; hi?: string} | undefined;
    const expObj = item.explanation as {en?: string; hi?: string} | undefined;

    if ((type === 'MCQ' || type === 'MSQ') && (!Array.isArray(item.options) || item.options.length < 2)) {
      return {valid: [], error: `Item ${i + 1}: MCQ/MSQ requires at least 2 options.`};
    }
    if (item.correctAnswer === undefined || item.correctAnswer === null) {
      return {valid: [], error: `Item ${i + 1}: "correctAnswer" is required.`};
    }

    parsed.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id : `imported-${Date.now()}-${i}`,
      section:
        secObj && secObj.en && secObj.hi
          ? {en: secObj.en, hi: secObj.hi}
          : {en: 'General Section', hi: 'सामान्य अनुभाग'},
      type,
      marks: typeof item.marks === 'number' ? item.marks : 2,
      negativeMark: typeof item.negativeMark === 'number' ? item.negativeMark : 0.25,
      question: {en: qObj.en, hi: qObj.hi},
      options: Array.isArray(item.options)
        ? (item.options as Question['options'])
        : undefined,
      correctAnswer: item.correctAnswer as string | string[],
      explanation:
        expObj && expObj.en && expObj.hi
          ? {en: expObj.en, hi: expObj.hi}
          : {en: 'Imported question.', hi: 'इम्पोर्ट किया गया प्रश्न।'},
      isSampleDevData: false,
    });
  }

  return {valid: parsed, error: null};
}

export const DashboardAdminPanels: React.FC<DashboardAdminPanelsProps> = ({
  lang,
  adminEmail,
  isAuthorizedAdminEmail,
  customQuestions,
  onSaveCustomQuestions,
  onLaunchCustomTest,
  banners,
  onBannersChange,
  onLockAdmin,
}) => {
  const [adminSubTab, setAdminSubTab] = useState<'importer' | 'banners'>('importer');
  const [bannerStatus, setBannerStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(SAMPLE_IMPORT_TEMPLATE, null, 2),
  );
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleLoadTemplate = () => {
    setJsonText(JSON.stringify(SAMPLE_IMPORT_TEMPLATE, null, 2));
    setImportStatus(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setJsonText(reader.result);
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = (mode: 'append' | 'replace') => {
    try {
      const parsed = JSON.parse(jsonText);
      const {valid, error} = validateImportedQuestions(parsed);
      if (error) {
        setImportStatus({type: 'error', message: error});
        return;
      }
      const next = mode === 'replace' ? valid : [...customQuestions, ...valid];
      onSaveCustomQuestions(next);
      setImportStatus({
        type: 'success',
        message:
          lang === 'hi'
            ? `${valid.length} प्रश्न सफलतापूर्वक इम्पोर्ट किए गए! कुल इम्पोर्टेड: ${next.length}`
            : `Imported ${valid.length} questions successfully! Total custom bank: ${next.length}.`,
      });
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Invalid JSON syntax.',
      });
    }
  };

  const handleBannerUpload = async (
    slot: BannerSlotId,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBannerStatus({
        type: 'error',
        message:
          lang === 'hi'
            ? 'कृपया केवल मान्य इमेज फ़ाइल (PNG, JPG, WebP) चुनें।'
            : 'Please select a valid image file (PNG, JPG, WebP).',
      });
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      const next: CustomBannersState = {
        ...banners,
        [slot]: {...banners[slot], imageDataUrl: dataUrl},
      };
      if (!saveCustomBanners(next)) {
        setBannerStatus({
          type: 'error',
          message:
            lang === 'hi'
              ? 'इमेज का आकार स्टोरेज सीमा से अधिक है। कृपया छोटी इमेज चुनें।'
              : 'Image exceeds browser storage limit. Please try a smaller image.',
        });
        return;
      }
      onBannersChange(next);
      setBannerStatus({
        type: 'success',
        message:
          lang === 'hi'
            ? 'कस्टम बैकग्राउंड सफलतापूर्वक सहेजा गया।'
            : 'Custom background image saved successfully.',
      });
    } catch {
      setBannerStatus({
        type: 'error',
        message:
          lang === 'hi'
            ? 'इमेज लोड करने में त्रुटि हुई।'
            : 'Failed to load selected image.',
      });
    }
  };

  const handleBannerThemeChange = (slot: BannerSlotId, textTheme: BannerTextTheme) => {
    const next: CustomBannersState = {
      ...banners,
      [slot]: {...banners[slot], textTheme},
    };
    saveCustomBanners(next);
    onBannersChange(next);
    setBannerStatus({
      type: 'success',
      message:
        lang === 'hi'
          ? 'टेक्स्ट थीम अपडेट की गई।'
          : 'Banner text contrast theme updated.',
    });
  };

  const handleResetBannerSlot = (slot: BannerSlotId) => {
    const next: CustomBannersState = {
      ...banners,
      [slot]: {...DEFAULT_BANNERS_STATE[slot]},
    };
    saveCustomBanners(next);
    onBannersChange(next);
    setBannerStatus({
      type: 'success',
      message:
        lang === 'hi'
          ? 'बैनर डिफ़ॉल्ट पर रीसेट किया गया।'
          : 'Banner reset to default.',
    });
  };

  const handleResetAllBanners = () => {
    saveCustomBanners(DEFAULT_BANNERS_STATE);
    onBannersChange(DEFAULT_BANNERS_STATE);
    setBannerStatus({
      type: 'success',
      message:
        lang === 'hi'
          ? 'सभी कस्टम बैनर डिफ़ॉल्ट पर रीसेट किए गए।'
          : 'All custom banners reset to defaults.',
    });
  };

  const bannerSlotsMeta: {
    id: BannerSlotId;
    title: string;
    subtitle: string;
    defaultPreviewUrl: string | null;
    fallbackClass: string;
    sampleHeadline: string;
  }[] = [
    {
      id: 'hero',
      title: lang === 'hi' ? 'होम हीरो बैनर' : 'Hero Banner',
      subtitle:
        lang === 'hi'
          ? 'मुख्य होम पेज खोज बैनर बैकग्राउंड'
          : 'Main home page search banner background',
      defaultPreviewUrl: null,
      fallbackClass: 'from-[#09142C] via-[#172554] to-[#1D4ED8]',
      sampleHeadline:
        lang === 'hi'
          ? 'सरकारी परीक्षा CBT मंच'
          : 'Crack Indian Govt Exams CBT',
    },
    {
      id: 'refer',
      title: lang === 'hi' ? 'रेफर और कमाएं कार्ड' : 'Refer & Earn Card',
      subtitle:
        lang === 'hi'
          ? 'रेफरल कार्ड बैकग्राउंड व टेक्स्ट कंट्रास्ट'
          : 'Referral banner background & text contrast',
      defaultPreviewUrl: '/images/refer-bg.png',
      fallbackClass: 'from-[#EEF2FF] via-[#F0F9FF] to-[#ECFDF5]',
      sampleHeadline:
        lang === 'hi'
          ? '2 दोस्त जोड़ें, ₹49 पैक फ्री'
          : 'Invite 2 Friends, Get ₹49 Free',
    },
    {
      id: 'dashboard',
      title: lang === 'hi' ? 'डैशबोर्ड हेडर' : 'Dashboard Header',
      subtitle:
        lang === 'hi'
          ? 'ऊपर दिए डैशबोर्ड हेडर पर तुरंत लागू होता है'
          : 'Applies live to this Dashboard Header immediately',
      defaultPreviewUrl: '/images/dashboard-bg.png',
      fallbackClass: 'from-slate-900 via-blue-950 to-indigo-950',
      sampleHeadline: t(UI_COPY.dashboard.heading, lang),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Unlocked Admin Header & Inner 2-Tab Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              {lang === 'hi' ? 'एडमिन पैनल सक्रिय' : 'Admin Panel Unlocked'}
            </div>
            <div className="text-xs text-slate-500">
              {isAuthorizedAdminEmail
                ? `${adminEmail}`
                : lang === 'hi'
                  ? 'पिन द्वारा सत्यापित सत्र'
                  : 'Verified via Admin PIN'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setAdminSubTab('importer')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition ${
                adminSubTab === 'importer'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>
                {lang === 'hi'
                  ? 'बल्क JSON इम्पोर्टर'
                  : 'Bulk JSON Question Importer'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAdminSubTab('banners')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition ${
                adminSubTab === 'banners'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>
                {lang === 'hi'
                  ? 'कस्टम बैनर व बैकग्राउंड'
                  : 'Custom Banner & Background Uploader'}
              </span>
            </button>
          </div>

          {!isAuthorizedAdminEmail && (
            <button
              type="button"
              onClick={onLockAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 min-h-[38px]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'लॉक करें' : 'Lock'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Tab 1: Bulk JSON Question Importer */}
      {adminSubTab === 'importer' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'hi' ? 'JSON बल्क प्रश्न इम्पोर्टर' : 'Bulk Question JSON Editor'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadTemplate}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  {lang === 'hi' ? 'सैंपल टेम्पलेट लोड करें' : 'Load Sample Template'}
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? '.json अपलोड' : 'Upload .json'}</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={15}
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 p-3.5 font-mono-num text-xs text-slate-800 bg-slate-50 focus:outline-none focus:border-[#2563EB]"
            />

            {importStatus && (
              <div
                className={`flex items-start gap-2 rounded-lg p-3 text-xs font-medium border ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {importStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleImportSubmit('append')}
                className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition min-h-[42px]"
              >
                {lang === 'hi' ? 'बैंक में जोड़ें (Append)' : 'Append to Question Bank'}
              </button>
              <button
                type="button"
                onClick={() => handleImportSubmit('replace')}
                className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition min-h-[42px]"
              >
                {lang === 'hi' ? 'बैंक बदलें (Replace)' : 'Replace Custom Bank'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Database className="w-4 h-4 text-[#1E40AF]" />
                  <span>
                    {lang === 'hi' ? 'कस्टम प्रश्न बैंक' : 'Custom Question Bank'} (
                    <span className="font-mono-num">{customQuestions.length}</span>)
                  </span>
                </div>
                {customQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSaveCustomQuestions([])}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    {lang === 'hi' ? 'सभी हटाएं' : 'Clear All'}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'hi'
                  ? 'इम्पोर्ट किए गए प्रश्न स्वतः मॉक टेस्ट में जुड़ जाते हैं, या आप केवल कस्टम प्रश्नों के साथ तुरंत नया CBT टेस्ट चला सकते हैं।'
                  : 'Imported questions automatically merge into mock tests, or you can launch a dedicated CBT test using only your custom imported bank.'}
              </p>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {customQuestions.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    {lang === 'hi'
                      ? 'अभी तक कोई कस्टम प्रश्न इम्पोर्ट नहीं किया गया है।'
                      : 'No custom questions imported yet.'}
                  </div>
                ) : (
                  customQuestions.map((cq, idx) => (
                    <div key={cq.id} className="p-3 text-xs">
                      <div className="font-semibold text-[#1E40AF]">
                        #{idx + 1} · {cq.type} · {t(cq.section, lang)}
                      </div>
                      <div className="text-slate-800 mt-0.5 line-clamp-2">
                        {t(cq.question, lang)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={customQuestions.length === 0}
              onClick={() => onLaunchCustomTest(customQuestions)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold transition min-h-[44px]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {lang === 'hi'
                  ? 'इम्पोर्टेड प्रश्नों का CBT शुरू करें'
                  : 'Launch CBT with Imported Questions'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Admin Tab 2: Custom Banner & Background Uploader */}
      {adminSubTab === 'banners' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'hi'
                  ? 'कस्टम बैनर व बैकग्राउंड अपलोडर'
                  : 'Custom Banner & Background Uploader'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {lang === 'hi'
                  ? 'गैलरी से इमेज अपलोड करें, Light/Dark टेक्स्ट चुनें या डिफ़ॉल्ट पर रीसेट करें।'
                  : 'Upload gallery images for Hero Banner, Refer & Earn Card, and Dashboard Header with Light/Dark text mode and Reset.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAllBanners}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'सभी रीसेट करें' : 'Reset All'}</span>
            </button>
          </div>

          {bannerStatus && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold border ${
                bannerStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {bannerStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{bannerStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bannerSlotsMeta.map((slot) => {
              const cfg = banners[slot.id];
              const previewSrc = cfg.imageDataUrl || slot.defaultPreviewUrl;
              const isLight = cfg.textTheme === 'light';

              return (
                <div
                  key={slot.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {slot.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {slot.subtitle}
                      </p>
                    </div>

                    {/* Live Preview Box */}
                    <div
                      className={`relative h-28 rounded-xl overflow-hidden bg-gradient-to-br ${slot.fallbackClass} border border-slate-200 flex items-end p-3`}
                    >
                      {previewSrc && (
                        <img
                          src={previewSrc}
                          alt={slot.title}
                          referrerPolicy="no-referrer"
                          className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 ${
                          isLight ? 'bg-black/35' : 'bg-white/65'
                        }`}
                      />
                      <div className="relative z-10 flex items-center justify-between gap-2 w-full">
                        <span
                          className={`text-xs font-extrabold truncate ${
                            isLight ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {slot.sampleHeadline}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                            cfg.imageDataUrl
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-900/65 text-white'
                          }`}
                        >
                          {cfg.imageDataUrl
                            ? lang === 'hi'
                              ? 'कस्टम'
                              : 'Custom'
                            : lang === 'hi'
                              ? 'डिफ़ॉल्ट'
                              : 'Default'}
                        </span>
                      </div>
                    </div>

                    {/* Light / Dark Text Toggle */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-600">
                        {lang === 'hi' ? 'टेक्स्ट रंग मोड' : 'Text Contrast Mode'}
                      </div>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleBannerThemeChange(slot.id, 'light')}
                          className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                            isLight
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>{lang === 'hi' ? 'हल्का (Light)' : 'Light Text'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBannerThemeChange(slot.id, 'dark')}
                          className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                            !isLight
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>{lang === 'hi' ? 'गहरा (Dark)' : 'Dark Text'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Upload & Reset Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer min-h-[40px] transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'hi' ? 'गैलरी से चुनें' : 'Upload Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleBannerUpload(slot.id, e)}
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleResetBannerSlot(slot.id)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold min-h-[40px] transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{lang === 'hi' ? 'रीसेट' : 'Reset'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
