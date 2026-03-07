import type {
  CourseInfo,
  CanvasQuiz,
  CanvasQuestion,
  CanvasModule,
  ExtractedQuiz,
} from '../types';

const PROXY_BASE = '/canvas-proxy';
const PER_PAGE = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a Canvas course URL into its base URL and course ID.
 * Accepts URLs like:
 *   https://boisestate.instructure.com/courses/12345
 *   https://boisestate.instructure.com/courses/12345/quizzes
 */
export function parseCourseUrl(raw: string): { baseUrl: string; courseId: string } | null {
  try {
    // No /i flag — the regex is case-sensitive so http:// is never accepted.
    const match = raw.trim().match(/^(https:\/\/[^/]+)\/courses\/(\d+)/);
    if (!match) return null;
    return { baseUrl: match[1], courseId: match[2] };
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags using DOMParser, which correctly handles all tag variants,
 * preserves entity-encoded content like &lt; and &gt;, and avoids the
 * silent content loss that regex-based stripping causes (e.g. "x < 5").
 */
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Perform a proxied GET request to the Canvas API with automatic pagination.
 * Returns all pages merged into a single array when the response is an array,
 * or the raw JSON object when it is not.
 */
async function canvasGet(
  path: string,
  canvasBaseUrl: string,
  token: string,
): Promise<unknown> {
  const allItems: unknown[] = [];
  let nextUrl: string | null = `${PROXY_BASE}${path}${path.includes('?') ? '&' : '?'}per_page=${PER_PAGE}`;

  while (nextUrl) {
    const currentUrl: string = nextUrl;
    const response: Response = await fetch(currentUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-canvas-base': canvasBaseUrl,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json() as { errors?: Array<{ message: string }> };
        detail = body?.errors?.[0]?.message ?? '';
      } catch { /* ignore */ }
      throw new Error(
        `Canvas API error ${response.status}${detail ? `: ${detail}` : ` (${response.statusText})`}`,
      );
    }

    const data: unknown = await response.json();

    if (Array.isArray(data)) {
      allItems.push(...(data as unknown[]));
    } else {
      // Single object (e.g. course info) — return immediately
      return data;
    }

    // Follow Link header pagination
    const linkHeader: string = response.headers.get('Link') ?? '';
    const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      // The next URL from Canvas is absolute — rewrite through proxy
      try {
        const nextCanvasUrl: URL = new URL(nextMatch[1]);
        nextUrl = `${PROXY_BASE}${nextCanvasUrl.pathname}${nextCanvasUrl.search}`;
      } catch {
        nextUrl = null;
      }
    } else {
      nextUrl = null;
    }
  }

  return allItems;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch basic course information (name, course_code). */
export async function fetchCourseInfo(
  baseUrl: string,
  courseId: string,
  token: string,
): Promise<CourseInfo> {
  const data = await canvasGet(`/api/v1/courses/${courseId}`, baseUrl, token);
  if (!data || typeof (data as CourseInfo).id !== 'number') {
    throw new Error('Canvas API returned an unexpected response for course info.');
  }
  return data as CourseInfo;
}

/**
 * Fetch all quizzes for a course.
 * Marks each quiz as New Quiz (isNewQuiz=true) when quiz_type === 'quizzes.next'.
 */
export async function fetchQuizzes(
  baseUrl: string,
  courseId: string,
  token: string,
): Promise<CanvasQuiz[]> {
  const data = await canvasGet(
    `/api/v1/courses/${courseId}/quizzes`,
    baseUrl,
    token,
  );
  if (!Array.isArray(data)) {
    throw new Error('Canvas API returned an unexpected response for quiz list.');
  }

  return (data as CanvasQuiz[]).map((q) => ({
    ...q,
    isNewQuiz: q.quiz_type === 'quizzes.next',
  }));
}

/**
 * Fetch all questions for a single Classic Quiz.
 * New Quizzes are NOT supported — call this only when isNewQuiz === false.
 */
export async function fetchQuizQuestions(
  baseUrl: string,
  courseId: string,
  quizId: number,
  token: string,
): Promise<CanvasQuestion[]> {
  const data = await canvasGet(
    `/api/v1/courses/${courseId}/quizzes/${quizId}/questions`,
    baseUrl,
    token,
  );
  return data as CanvasQuestion[];
}

/**
 * Build a map of quizId → moduleName by fetching all course modules.
 * Uses include[]=items to reduce round-trips.
 * Silently returns an empty map on failure (module info is optional).
 */
export async function buildModuleMap(
  baseUrl: string,
  courseId: string,
  token: string,
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const modules = await canvasGet(
      `/api/v1/courses/${courseId}/modules?include[]=items`,
      baseUrl,
      token,
    ) as CanvasModule[];

    for (const mod of modules) {
      for (const item of mod.items ?? []) {
        if (item.type === 'Quiz') {
          map.set(item.content_id, mod.name);
        }
      }
    }
  } catch {
    // Module info is optional — swallow errors silently
  }
  return map;
}

/**
 * Extract questions from the selected quizzes.
 * Reports progress via the onProgress callback: (current, total, quizTitle).
 */
export async function extractQuizzes(
  baseUrl: string,
  courseId: string,
  token: string,
  quizzes: CanvasQuiz[],
  onProgress: (current: number, total: number, quizTitle: string) => void,
): Promise<ExtractedQuiz[]> {
  // Build module map first (best-effort)
  const moduleMap = await buildModuleMap(baseUrl, courseId, token);

  const results: ExtractedQuiz[] = [];
  const total = quizzes.length;

  for (let i = 0; i < quizzes.length; i++) {
    const quiz = quizzes[i];

    // Attach module name if found
    const quizWithModule: CanvasQuiz = {
      ...quiz,
      moduleName: moduleMap.get(quiz.id),
    };

    if (quiz.isNewQuiz) {
      // New Quizzes are unsupported — include in results with empty questions
      // so the Word export can emit the unsupported notice.
      results.push({ quiz: quizWithModule, questions: [] });
    } else {
      const questions = await fetchQuizQuestions(baseUrl, courseId, quiz.id, token);
      results.push({ quiz: quizWithModule, questions });
    }

    // Report progress AFTER the quiz is processed so the percentage reflects
    // completed work (fixes 0% shown throughout single-quiz extraction).
    onProgress(i + 1, total, quiz.title);
  }

  return results;
}
