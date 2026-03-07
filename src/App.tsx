import React, { useState, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { QuizSelector } from './components/QuizSelector';
import { ExtractingView, CompleteView } from './components/QuizExtractor';
import {
  fetchCourseInfo,
  fetchQuizzes,
  extractQuizzes,
} from './services/canvasService';
import { generateAndDownloadWordDoc } from './services/wordExportService';
import type { AppState } from './types';

const initialState: AppState = {
  step: 'setup',
  canvasCourseUrl: '',
  canvasBaseUrl: null,
  courseId: null,
  courseInfo: null,
  quizzes: [],
  selectedQuizIds: new Set(),
  extractedQuizzes: [],
  isLoading: false,
  error: null,
};

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>(initialState);

  // The Canvas API token is kept in a ref (not in state) so it is not exposed
  // in the React component tree and is invisible to React DevTools / extensions.
  const canvasApiTokenRef = useRef<string | null>(null);

  // Extraction progress state (separate so it doesn't re-render the full state)
  const [extractProgress, setExtractProgress] = useState({
    current: 0,
    total: 0,
    currentQuizTitle: '',
  });
  const [isDownloading, setIsDownloading] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Step 1 → 2: Connect to Canvas, load course info and quiz list.
   */
  const handleConnect = useCallback(
    async (courseUrl: string, baseUrl: string, courseId: string, token: string) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        const [courseInfo, quizzes] = await Promise.all([
          fetchCourseInfo(baseUrl, courseId, token),
          fetchQuizzes(baseUrl, courseId, token),
        ]);

        // Store token in ref (not state) to keep it out of the React DevTools tree.
        canvasApiTokenRef.current = token;

        setState((s) => ({
          ...s,
          step: 'quiz-selection',
          canvasCourseUrl: courseUrl,
          canvasBaseUrl: baseUrl,
          courseId,
          courseInfo,
          quizzes,
          selectedQuizIds: new Set(),
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error connecting to Canvas.',
        }));
      }
    },
    [],
  );

  const handleToggleQuiz = useCallback((id: number) => {
    setState((s) => {
      const next = new Set(s.selectedQuizIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, selectedQuizIds: next };
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setState((s) => {
      const classicIds = s.quizzes.filter((q) => !q.isNewQuiz).map((q) => q.id);
      return { ...s, selectedQuizIds: new Set(classicIds) };
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setState((s) => ({ ...s, selectedQuizIds: new Set() }));
  }, []);

  /**
   * Step 2 → 3 → 4: Extract selected quizzes, then show complete view.
   */
  const handleExtract = useCallback(async () => {
    // Guard against re-entrant calls (e.g. double-click before state settles).
    if (state.step !== 'quiz-selection') return;

    const { canvasBaseUrl, courseId, quizzes, selectedQuizIds } = state;
    const canvasApiToken = canvasApiTokenRef.current;
    if (!canvasBaseUrl || !courseId || !canvasApiToken) return;

    const selected = quizzes.filter((q) => selectedQuizIds.has(q.id));
    if (selected.length === 0) return;

    setState((s) => ({ ...s, step: 'extracting' }));
    // Start at current=0 so the progress bar reads 0% until the first quiz completes.
    setExtractProgress({ current: 0, total: selected.length, currentQuizTitle: '' });

    try {
      const extracted = await extractQuizzes(
        canvasBaseUrl,
        courseId,
        canvasApiToken,
        selected,
        (current, total, currentQuizTitle) => {
          setExtractProgress({ current, total, currentQuizTitle });
        },
      );

      setState((s) => ({
        ...s,
        step: 'complete',
        extractedQuizzes: extracted,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'quiz-selection',
        error: err instanceof Error ? err.message : 'Extraction failed.',
      }));
    }
  }, [state]);

  /**
   * Download the Word document.
   */
  const handleDownload = useCallback(async () => {
    if (!state.courseInfo) return;
    setIsDownloading(true);
    try {
      await generateAndDownloadWordDoc(state.courseInfo.name, state.extractedQuizzes);
    } finally {
      setIsDownloading(false);
    }
  }, [state.courseInfo, state.extractedQuizzes]);

  /**
   * Reset everything back to the setup screen.
   */
  const handleStartOver = useCallback(() => {
    canvasApiTokenRef.current = null;
    setState(initialState);
    setExtractProgress({ current: 0, total: 0, currentQuizTitle: '' });
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout
      step={state.step}
      onReturnToDashboard={state.step !== 'setup' ? handleStartOver : undefined}
    >
      {state.step === 'setup' && (
        <Dashboard
          onConnect={handleConnect}
          isLoading={state.isLoading}
          error={state.error}
        />
      )}

      {state.step === 'quiz-selection' && state.courseInfo && (
        <QuizSelector
          courseInfo={state.courseInfo}
          quizzes={state.quizzes}
          selectedQuizIds={state.selectedQuizIds}
          onToggleQuiz={handleToggleQuiz}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onExtract={handleExtract}
          isExtracting={false}
        />
      )}

      {state.step === 'extracting' && (
        <ExtractingView
          current={extractProgress.current}
          total={extractProgress.total}
          currentQuizTitle={extractProgress.currentQuizTitle}
        />
      )}

      {state.step === 'complete' && state.courseInfo && (
        <CompleteView
          extractedQuizzes={state.extractedQuizzes}
          courseName={state.courseInfo.name}
          onDownload={handleDownload}
          onStartOver={handleStartOver}
          isDownloading={isDownloading}
        />
      )}
    </Layout>
  );
};
