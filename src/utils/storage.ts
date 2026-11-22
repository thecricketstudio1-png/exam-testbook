import {
  AttemptResult,
  BookmarkItem,
  Language,
  Question,
  SavedTestProgress,
} from '../types/exam';

const KEYS = {
  LANGUAGE: 'etb_language_v1',
  ACTIVE_PROGRESS: 'etb_active_test_progress_v1',
  ATTEMPT_HISTORY: 'etb_attempt_history_v1',
  BOOKMARKS: 'etb_bookmarks_v1',
  CUSTOM_QUESTIONS: 'etb_custom_questions_v1',
  UNLOCKED_TESTS: 'etb_unlocked_tests_v1',
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors cleanly
  }
}

export function getSavedLanguage(): Language {
  const val = localStorage.getItem(KEYS.LANGUAGE);
  return val === 'hi' ? 'hi' : 'en';
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(KEYS.LANGUAGE, lang);
  } catch {
    // Ignore
  }
}

export function getSavedTestProgress(): SavedTestProgress | null {
  return safeRead<SavedTestProgress | null>(KEYS.ACTIVE_PROGRESS, null);
}

export function saveTestProgress(progress: SavedTestProgress): void {
  safeWrite(KEYS.ACTIVE_PROGRESS, progress);
}

export function clearTestProgress(): void {
  try {
    localStorage.removeItem(KEYS.ACTIVE_PROGRESS);
  } catch {
    // Ignore
  }
}

export function getAttemptHistory(): AttemptResult[] {
  return safeRead<AttemptResult[]>(KEYS.ATTEMPT_HISTORY, []);
}

export function addAttemptResult(result: AttemptResult): AttemptResult[] {
  const existing = getAttemptHistory();
  const updated = [result, ...existing].slice(0, 50);
  safeWrite(KEYS.ATTEMPT_HISTORY, updated);
  return updated;
}

export function clearAttemptHistory(): void {
  safeWrite(KEYS.ATTEMPT_HISTORY, []);
}

export function getBookmarks(): BookmarkItem[] {
  return safeRead<BookmarkItem[]>(KEYS.BOOKMARKS, []);
}

export function toggleBookmarkStorage(
  question: Question,
  examName?: {en: string; hi: string},
): BookmarkItem[] {
  const current = getBookmarks();
  const exists = current.some((b) => b.questionId === question.id);
  const updated = exists
    ? current.filter((b) => b.questionId !== question.id)
    : [{questionId: question.id, savedAt: Date.now(), examName, question}, ...current];
  safeWrite(KEYS.BOOKMARKS, updated);
  return updated;
}

export function getCustomQuestions(): Question[] {
  return safeRead<Question[]>(KEYS.CUSTOM_QUESTIONS, []);
}

export function saveCustomQuestions(questions: Question[]): void {
  safeWrite(KEYS.CUSTOM_QUESTIONS, questions);
}

export function getUnlockedTestIds(): string[] {
  return safeRead<string[]>(KEYS.UNLOCKED_TESTS, []);
}

export function unlockTestIds(ids: string[]): string[] {
  const current = new Set(getUnlockedTestIds());
  for (const id of ids) current.add(id);
  const next = Array.from(current);
  safeWrite(KEYS.UNLOCKED_TESTS, next);
  return next;
}

export function setUnlockedTestIds(ids: string[]): string[] {
  const next = Array.from(new Set(ids));
  safeWrite(KEYS.UNLOCKED_TESTS, next);
  return next;
}
