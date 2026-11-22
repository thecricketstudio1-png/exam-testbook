export type Language = 'en' | 'hi';

export interface BilingualText {
  en: string;
  hi: string;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'NAT';

export type QuestionStatusFilter = 'all' | 'correct' | 'wrong' | 'skipped';

export interface QuestionOption {
  id: string;
  text: BilingualText;
}

export interface Question {
  id: string;
  section: BilingualText;
  type: QuestionType;
  marks: number;
  negativeMark: number;
  question: BilingualText;
  options?: QuestionOption[];
  /** For MCQ: single option id (e.g. 'b'). For MSQ: array of option ids (e.g. ['a', 'c']). For NAT: numeric string (e.g. '42.5'). */
  correctAnswer: string | string[];
  explanation: BilingualText;
  isSampleDevData?: boolean;
  tags?: string[];
}

export type ExamCategoryId =
  | 'railway'
  | 'ssc'
  | 'banking'
  | 'police'
  | 'defence'
  | 'teaching'
  | 'upsc_psc'
  | 'other_govt'
  | 'engineering';

export interface ExamCategory {
  id: ExamCategoryId;
  name: BilingualText;
  description: BilingualText;
  iconName:
    | 'Train'
    | 'Landmark'
    | 'Building2'
    | 'Shield'
    | 'Award'
    | 'BookOpen'
    | 'Scale'
    | 'Briefcase'
    | 'Cpu';
}

export interface MockTest {
  id: string;
  examId: string;
  title: BilingualText;
  durationMinutes: number;
  totalMarks: number;
  negativeMark: number;
  questionCount: number;
  tier: 'free' | 'single' | 'bundle';
  priceInr: number;
  sections: BilingualText[];
  questionIds?: string[];
}

export interface ExamItem {
  id: string;
  categoryId: ExamCategoryId;
  name: BilingualText;
  shortName: string;
  duration: number; // in minutes
  totalMarks: number;
  negativeMark: number;
  sections: BilingualText[];
  tests: MockTest[];
}

export type ResponseValue = string | string[] | null;

export interface SavedTestProgress {
  testId: string;
  examId: string;
  testTitle: BilingualText;
  examName: BilingualText;
  responses: Record<string, ResponseValue>;
  marked: Record<string, boolean>;
  visited: Record<string, boolean>;
  timeLeft: number; // seconds
  totalDurationSeconds: number;
  currentIndex: number;
  language: Language;
  updatedAt: number;
}

export interface QuestionResultDetail {
  question: Question;
  userResponse: ResponseValue;
  status: 'correct' | 'wrong' | 'skipped';
  marksAwarded: number;
}

export interface SectionBreakdown {
  section: BilingualText;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface AttemptResult {
  id: string;
  testId: string;
  examId: string;
  testTitle: BilingualText;
  examName: BilingualText;
  submittedAt: number;
  timeTakenSeconds: number;
  totalDurationSeconds: number;
  score: number;
  maxScore: number;
  positiveMarks: number;
  negativeMarksDeducted: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  sectionBreakdown: SectionBreakdown[];
  details: QuestionResultDetail[];
}

export interface BookmarkItem {
  questionId: string;
  savedAt: number;
  examName?: BilingualText;
  question: Question;
}

export type NavTab = 'home' | 'exams' | 'quiz' | 'saved' | 'dashboard';
