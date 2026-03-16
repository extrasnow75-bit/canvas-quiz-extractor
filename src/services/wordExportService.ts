import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
} from 'docx';
import type { ExtractedQuiz, CanvasQuestion, CanvasAnswer } from '../types';
import { SUPPORTED_QUESTION_TYPES } from '../types';
import { stripHtml } from './canvasService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Canvas answer weight to a pass/fail boolean. */
function isCorrect(answer: CanvasAnswer): boolean {
  return answer.weight > 0;
}

/**
 * Returns true when the quiz type indicates there are no correct answers
 * (surveys and graded surveys don't have right/wrong answers).
 */
function isSurveyQuiz(quizType: string): boolean {
  return quizType === 'survey' || quizType === 'graded_survey';
}

/**
 * Returns true when every answer on a question shares the same weight value
 * AND the question type is NOT multiple_answers_question.
 *
 * This catches cases where Canvas assigns a default weight to all answers
 * (e.g. weight=100 for every answer in an unscored survey), which would
 * incorrectly mark every answer as "correct".
 *
 * Exception: multiple_answers_question legitimately allows all answers to be
 * correct (weight=100 each), so we never suppress asterisks for that type.
 */
function allWeightsEqualAndAmbiguous(answers: CanvasAnswer[], questionType: string): boolean {
  if (questionType === 'multiple_answers_question') return false;
  if (answers.length === 0) return true;
  // A single answer is unambiguously correct — don't suppress the asterisk.
  if (answers.length === 1) return false;
  const first = answers[0].weight;
  return answers.every((a) => a.weight === first);
}

/** Get clean answer text (prefer plain text over HTML). */
function answerText(answer: CanvasAnswer): string {
  if (answer.text?.trim()) return answer.text.trim();
  if (answer.html?.trim()) return stripHtml(answer.html);
  return '';
}

/** Map a 0-based index to a letter: 0→a, 1→b, … 25→z. Falls back to numeric labels beyond 26. */
function indexToLetter(i: number): string {
  if (i < 26) return String.fromCharCode(97 + i);
  return String(i + 1); // e.g. 27th answer → "27"
}

// ─── Paragraph builders ───────────────────────────────────────────────────────

function normalParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 /* 12pt */ })],
    alignment: AlignmentType.LEFT,
    spacing: { after: 0 },
  });
}

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text, bold: true })],
    spacing: { after: 120 },
  });
}

function heading1Paragraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text })],
    spacing: { before: 240, after: 80 },
  });
}

function heading2Paragraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text }) ],
    spacing: { before: 160, after: 60 },
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: '' })] });
}

// ─── Question formatters ───────────────────────────────────────────────────────

/**
 * Format a supported question into an array of paragraphs matching the
 * required formatting document:
 *
 *   [Type: E]            ← essay only
 *   Points: N
 *   N) Question text
 *   *a) Correct answer   ← asterisk before letter = correct
 *    b) Wrong answer
 *   …
 *
 * @param suppressCorrect  When true (survey quizzes), no asterisks are emitted.
 */
function formatQuestion(
  question: CanvasQuestion,
  questionNumber: number,
  suppressCorrect: boolean = false,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const qType = question.question_type;
  const points = question.points_possible ?? 1;
  const qText = stripHtml(question.question_text);

  // Essay type marker
  if (qType === 'essay_question') {
    paragraphs.push(normalParagraph('Type: E'));
  }

  // Points line
  paragraphs.push(normalParagraph(`Points: ${points}`));

  // Question text
  paragraphs.push(normalParagraph(`${questionNumber}) ${qText}`));

  // Answers (not for essay)
  if (qType !== 'essay_question') {
    const answers = question.answers ?? [];

    // Suppress asterisks if:
    //   (A) the quiz itself is a survey type, OR
    //   (B) all answer weights are identical for a non-multiple-answers type
    //       (Canvas default — no meaningful distinction)
    const hideAsterisks = suppressCorrect || allWeightsEqualAndAmbiguous(answers, qType);

    answers.forEach((answer, idx) => {
      const letter = indexToLetter(idx);
      const text = answerText(answer);
      const correct = !hideAsterisks && isCorrect(answer);
      paragraphs.push(normalParagraph(`${correct ? '*' : ''}${letter}) ${text}`));
    });
  }

  return paragraphs;
}

// ─── Public export function ────────────────────────────────────────────────────

/**
 * Build and download a Word document (.docx) containing the extracted quiz
 * questions formatted per the required formatting document.
 *
 * Document structure:
 *   [Title]     [Course Name] Quiz Questions
 *   [Heading 1] Quiz title
 *   [Heading 2] Module name (if available)
 *   [Normal]    Points: N
 *   [Normal]    N) Question text
 *   [Normal]    *a) Correct answer
 *   [Normal]     b) Answer …
 */
export async function generateAndDownloadWordDoc(
  courseName: string,
  extractedQuizzes: ExtractedQuiz[],
): Promise<void> {
  const children: Paragraph[] = [];

  // Document title
  children.push(titleParagraph(`${courseName} Quiz Questions`));
  children.push(emptyLine());

  for (const { quiz, questions } of extractedQuizzes) {
    // ── Quiz heading (Heading 1) ───────────────────────────────────────────
    children.push(heading1Paragraph(quiz.title));

    // ── Module heading (Heading 2, optional) ─────────────────────────────
    if (quiz.moduleName) {
      children.push(heading2Paragraph(quiz.moduleName));
    }

    // ── New Quiz unsupported notice ───────────────────────────────────────
    if (quiz.isNewQuiz) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '⚠ New Quizzes are not supported. Questions for this quiz could not be extracted.',
              italics: true,
              color: 'CC0000',
              size: 24,
            }),
          ],
          spacing: { after: 120 },
        }),
      );
      children.push(emptyLine());
      continue;
    }

    // ── Questions ─────────────────────────────────────────────────────────
    const supportedQuestions = questions.filter((q) =>
      SUPPORTED_QUESTION_TYPES.has(q.question_type),
    );
    const skippedCount = questions.length - supportedQuestions.length;

    if (supportedQuestions.length === 0 && questions.length > 0) {
      children.push(
        normalParagraph('No supported question types found in this quiz.'),
      );
    }

    // Suppress correct-answer asterisks for survey/graded-survey quizzes
    const suppressCorrect = isSurveyQuiz(quiz.quiz_type);

    supportedQuestions.forEach((question, idx) => {
      const paragraphs = formatQuestion(question, idx + 1, suppressCorrect);
      children.push(...paragraphs);
      children.push(emptyLine()); // blank line between questions
    });

    // Skipped question type notice
    if (skippedCount > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Note: ${skippedCount} question${skippedCount > 1 ? 's were' : ' was'} skipped (unsupported question type).`,
              italics: true,
              color: '888888',
              size: 20,
            }),
          ],
          spacing: { after: 80 },
        }),
      );
    }

    children.push(emptyLine());
  }

  // ── Build document ───────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'eCampus Canvas Quiz Extractor',
    title: `${courseName} Quiz Questions`,
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${courseName.replace(/[^a-z0-9]/gi, '_')}_Quiz_Questions.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revocation so the browser has time to start the download before the
  // object URL is invalidated (immediate revocation can produce zero-byte files
  // in Firefox).
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
