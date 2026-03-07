import React from 'react';
import { AlertTriangle, CheckSquare, Square, Loader2, BookOpen } from 'lucide-react';
import type { CanvasQuiz, CourseInfo } from '../types';

interface QuizSelectorProps {
  courseInfo: CourseInfo;
  quizzes: CanvasQuiz[];
  selectedQuizIds: Set<number>;
  onToggleQuiz: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExtract: () => void;
  isExtracting: boolean;
}

const NewQuizBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
    New Quiz — not supported
  </span>
);

const ClassicBadge = () => (
  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">
    Classic Quiz
  </span>
);

export const QuizSelector: React.FC<QuizSelectorProps> = ({
  courseInfo,
  quizzes,
  selectedQuizIds,
  onToggleQuiz,
  onSelectAll,
  onDeselectAll,
  onExtract,
  isExtracting,
}) => {
  const classicQuizzes = quizzes.filter((q) => !q.isNewQuiz);
  const newQuizzes = quizzes.filter((q) => q.isNewQuiz);
  const allClassicSelected =
    classicQuizzes.length > 0 && classicQuizzes.every((q) => selectedQuizIds.has(q.id));
  const someSelected = selectedQuizIds.size > 0;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full max-w-3xl space-y-6">

        {/* ── Course header ── */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#E64C3C] rounded-2xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1">Course loaded</p>
              <h2 className="text-2xl font-black text-gray-900">{courseInfo.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{courseInfo.course_code}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="font-bold">{quizzes.length} total quiz{quizzes.length !== 1 ? 'zes' : ''}</span>
            <span className="text-gray-400" aria-hidden="true">|</span>
            <span className="text-green-700 font-bold">{classicQuizzes.length} extractable</span>
            {newQuizzes.length > 0 && (
              <>
                <span className="text-gray-400" aria-hidden="true">|</span>
                <span className="text-amber-700 font-bold">{newQuizzes.length} New Quiz (not supported)</span>
              </>
            )}
          </div>
        </div>

        {/* ── New Quizzes notice ── */}
        {newQuizzes.length > 0 && classicQuizzes.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800">No Classic Quizzes found</p>
              <p className="text-sm text-amber-700 mt-1">
                All quizzes in this course use Canvas's New Quizzes engine, which does not provide
                a public API for question extraction. Nothing can be extracted from this course.
              </p>
            </div>
          </div>
        )}

        {/* ── Quiz list ── */}
        {quizzes.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* List header / bulk actions */}
            <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <span className="font-black text-sm text-gray-700 uppercase tracking-widest">
                Select Quizzes to Extract
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={onSelectAll}
                  disabled={classicQuizzes.length === 0}
                  className="text-xs font-bold text-[#c0392b] hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  Select All
                </button>
                <span className="text-gray-400" aria-hidden="true">|</span>
                <button
                  onClick={onDeselectAll}
                  disabled={!someSelected}
                  className="text-xs font-bold text-gray-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Quiz rows */}
            <ul className="divide-y divide-gray-100">
              {quizzes.map((quiz) => {
                const isSelected = selectedQuizIds.has(quiz.id);
                const disabled = quiz.isNewQuiz;

                return (
                  <li key={quiz.id}>
                    <button
                      onClick={() => !disabled && onToggleQuiz(quiz.id)}
                      disabled={disabled}
                      aria-pressed={disabled ? undefined : isSelected}
                      aria-label={
                        disabled
                          ? `${quiz.title} (New Quiz — not supported)`
                          : [
                              isSelected ? 'Deselect' : 'Select',
                              quiz.title,
                              !quiz.isNewQuiz && quiz.question_count != null
                                ? `${quiz.question_count} question${quiz.question_count !== 1 ? 's' : ''}`
                                : null,
                              quiz.points_possible > 0
                                ? `${quiz.points_possible} point${quiz.points_possible !== 1 ? 's' : ''}`
                                : null,
                              quiz.moduleName ? `Module: ${quiz.moduleName}` : null,
                              !quiz.published ? 'Unpublished' : null,
                            ]
                              .filter(Boolean)
                              .join(', ')
                      }
                      className={`w-full px-8 py-5 flex items-start gap-4 text-left transition-colors ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : isSelected
                          ? 'bg-red-50 hover:bg-red-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox icon */}
                      <div className="mt-0.5 flex-shrink-0" aria-hidden="true">
                        {disabled ? (
                          <Square className="w-5 h-5 text-gray-300" />
                        ) : isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#E64C3C]" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      {/* Quiz info */}
                      <div className="flex-1 min-w-0" aria-hidden="true">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900 truncate">{quiz.title}</span>
                          {quiz.isNewQuiz ? <NewQuizBadge /> : <ClassicBadge />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          {!quiz.isNewQuiz && (
                            <span>{quiz.question_count} question{quiz.question_count !== 1 ? 's' : ''}</span>
                          )}
                          {quiz.points_possible > 0 && (
                            <span>{quiz.points_possible} pt{quiz.points_possible !== 1 ? 's' : ''}</span>
                          )}
                          {quiz.moduleName && (
                            <span className="italic">Module: {quiz.moduleName}</span>
                          )}
                          {!quiz.published && (
                            <span className="text-amber-700 font-bold">Unpublished</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── Extract button ── */}
        {classicQuizzes.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-2xl shadow border border-gray-100 px-8 py-5">
            <div>
              <p className="font-black text-gray-900">
                {someSelected
                  ? `${selectedQuizIds.size} quiz${selectedQuizIds.size !== 1 ? 'zes' : ''} selected`
                  : 'No quizzes selected'}
              </p>
              <p className="text-sm text-gray-600">
                {someSelected ? 'Ready to extract and download.' : 'Select at least one quiz above.'}
              </p>
            </div>
            <button
              onClick={onExtract}
              disabled={!someSelected || isExtracting}
              className="px-8 py-3 bg-[#E64C3C] text-white rounded-2xl font-black hover:bg-[#c0392b] transition-all disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-2 active:scale-95"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Extracting…
                </>
              ) : (
                'Extract & Download'
              )}
            </button>
          </div>
        )}

        {/* "Select all" shortcut when none selected */}
        {classicQuizzes.length > 0 && !someSelected && !allClassicSelected && (
          <button
            onClick={onSelectAll}
            className="w-full py-3 border-2 border-dashed border-[#E64C3C] text-[#c0392b] rounded-2xl font-black hover:bg-red-50 transition-all text-sm"
          >
            Select All {classicQuizzes.length} Classic Quiz{classicQuizzes.length !== 1 ? 'zes' : ''}
          </button>
        )}

      </div>
    </div>
  );
};
