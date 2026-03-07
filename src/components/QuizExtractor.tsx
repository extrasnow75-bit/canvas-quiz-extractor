import React from 'react';
import { Loader2, CheckCircle, Download, RotateCcw, FileText, AlertTriangle } from 'lucide-react';
import type { ExtractedQuiz } from '../types';
import { SUPPORTED_QUESTION_TYPES } from '../types';

interface ExtractingProps {
  /** Current quiz being fetched (1-based) */
  current: number;
  total: number;
  currentQuizTitle: string;
}

interface CompleteProps {
  extractedQuizzes: ExtractedQuiz[];
  courseName: string;
  onDownload: () => void;
  onStartOver: () => void;
  isDownloading: boolean;
}

// ─── Extracting (progress) view ───────────────────────────────────────────────

export const ExtractingView: React.FC<ExtractingProps> = ({ current, total, currentQuizTitle }) => {
  // current reflects completed quizzes (0 = none done yet).
  // Dividing by total gives an accurate "fraction done" reading.
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 w-full max-w-lg text-center">
        <div className="w-16 h-16 bg-[#E64C3C] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Extracting Questions</h2>
        <p className="text-gray-600 mb-6 text-sm">
          {current === 0
            ? 'Starting extraction…'
            : `Extracted ${current} of ${total} quiz${total !== 1 ? 'zes' : ''}`}
        </p>

        {/* Progress bar */}
        <div
          className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Extraction progress: ${pct}%`}
        >
          <div
            className="bg-[#E64C3C] h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {currentQuizTitle && (
          <p className="text-sm text-gray-700 font-bold truncate px-4">{currentQuizTitle}</p>
        )}
        <p className="text-xs text-gray-600 mt-1" aria-hidden="true">{pct}% complete</p>
      </div>
    </div>
  );
};

// ─── Complete (results + download) view ──────────────────────────────────────

export const CompleteView: React.FC<CompleteProps> = ({
  extractedQuizzes,
  courseName,
  onDownload,
  onStartOver,
  isDownloading,
}) => {
  const totalQuestions = extractedQuizzes.reduce((acc, { quiz, questions }) => {
    if (quiz.isNewQuiz) return acc;
    return acc + questions.filter((q) => SUPPORTED_QUESTION_TYPES.has(q.question_type)).length;
  }, 0);

  const newQuizCount = extractedQuizzes.filter((e) => e.quiz.isNewQuiz).length;
  const classicCount = extractedQuizzes.filter((e) => !e.quiz.isNewQuiz).length;

  const skippedTotal = extractedQuizzes.reduce((acc, { quiz, questions }) => {
    if (quiz.isNewQuiz) return acc;
    return acc + questions.filter((q) => !SUPPORTED_QUESTION_TYPES.has(q.question_type)).length;
  }, 0);

  return (
    <div className="flex flex-col items-center py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* ── Success card ── */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Extraction Complete!</h2>
          <p className="text-gray-600 text-sm mb-8">
            Your Word document is ready to download.
          </p>

          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="w-full py-4 bg-[#2b579a] text-white rounded-2xl font-black text-base hover:bg-[#1e3f7a] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                Generating document…
              </>
            ) : (
              <>
                <Download className="w-5 h-5" aria-hidden="true" />
                Download Word Document (.docx)
              </>
            )}
          </button>
        </div>

        {/* ── Summary card ── */}
        <div className="bg-white rounded-3xl shadow border border-gray-100 p-8">
          <h3 className="font-black text-sm text-gray-700 uppercase tracking-widest mb-5">Extraction Summary</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-gray-900">{classicCount}</p>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mt-1">Classic Quizzes</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-gray-900">{totalQuestions}</p>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mt-1">Questions Extracted</p>
            </div>
          </div>

          {/* Per-quiz breakdown */}
          <ul className="space-y-3">
            {extractedQuizzes.map(({ quiz, questions }) => {
              const supported = questions.filter((q) => SUPPORTED_QUESTION_TYPES.has(q.question_type));
              const skipped = questions.length - supported.length;

              return (
                <li key={quiz.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="mt-0.5 flex-shrink-0" aria-hidden="true">
                    {quiz.isNewQuiz ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{quiz.title}</p>
                    {quiz.isNewQuiz ? (
                      <p className="text-xs text-amber-700 font-bold mt-0.5">
                        New Quiz — not supported, noted in document
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {supported.length} question{supported.length !== 1 ? 's' : ''} extracted
                        {skipped > 0 ? `, ${skipped} skipped (unsupported type)` : ''}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Totals / notes */}
          {(newQuizCount > 0 || skippedTotal > 0) && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              {newQuizCount > 0 && (
                <p>⚠ {newQuizCount} New Quiz{newQuizCount !== 1 ? 'zes were' : ' was'} flagged as unsupported in the document.</p>
              )}
              {skippedTotal > 0 && (
                <p>⚠ {skippedTotal} question{skippedTotal !== 1 ? 's were' : ' was'} skipped (unsupported question type). These are noted in the document.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Start over ── */}
        <button
          onClick={onStartOver}
          className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Start Over
        </button>

      </div>
    </div>
  );
};
