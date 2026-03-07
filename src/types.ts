// ─── App flow steps ───────────────────────────────────────────────────────────
export type AppStep = 'setup' | 'quiz-selection' | 'extracting' | 'complete';

// ─── Canvas API response shapes ────────────────────────────────────────────────

export interface CourseInfo {
  id: number;
  name: string;
  course_code: string;
}

export interface CanvasQuiz {
  id: number;
  title: string;
  /** 'quizzes.next' = New Quiz (unsupported); others = Classic Quiz */
  quiz_type: string;
  question_count: number;
  points_possible: number;
  published: boolean;
  /** Derived: true when quiz_type === 'quizzes.next' */
  isNewQuiz: boolean;
  /** Populated after module lookup (optional) */
  moduleName?: string;
}

export interface CanvasAnswer {
  id: number;
  text: string;
  html?: string;
  /** 100 = correct, 0 = incorrect, intermediate values possible for partial credit */
  weight: number;
}

export interface CanvasQuestion {
  id: number;
  /**
   * Supported:
   *   multiple_choice_question
   *   true_false_question
   *   multiple_answers_question
   *   essay_question
   *
   * Unsupported (skipped in output):
   *   short_answer_question, fill_in_multiple_blanks_question,
   *   matching_question, numerical_question, calculated_question, etc.
   */
  question_type: string;
  question_name: string;
  question_text: string;
  points_possible: number;
  answers: CanvasAnswer[];
}

export interface CanvasModule {
  id: number;
  name: string;
  items?: CanvasModuleItem[];
}

export interface CanvasModuleItem {
  id: number;
  type: string;        // 'Quiz', 'Assignment', 'Page', etc.
  content_id: number;  // matches the quiz id for type='Quiz'
  title: string;
}

// ─── Extracted data ready for Word export ─────────────────────────────────────

export interface ExtractedQuiz {
  quiz: CanvasQuiz;
  questions: CanvasQuestion[];
}

// ─── App-level state (managed in App.tsx) ─────────────────────────────────────

export interface AppState {
  step: AppStep;
  // Credentials & connection (token is kept in a ref in App.tsx, not in state)
  canvasCourseUrl: string;
  canvasBaseUrl: string | null;
  courseId: string | null;
  // Course & quiz data
  courseInfo: CourseInfo | null;
  quizzes: CanvasQuiz[];
  selectedQuizIds: Set<number>;
  // Extraction results
  extractedQuizzes: ExtractedQuiz[];
  // UI feedback
  isLoading: boolean;
  error: string | null;
}

// Supported question types (the four from the formatting doc)
export const SUPPORTED_QUESTION_TYPES = new Set([
  'multiple_choice_question',
  'true_false_question',
  'multiple_answers_question',
  'essay_question',
]);
