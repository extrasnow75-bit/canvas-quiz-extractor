import React from 'react';
import { HelpCircle, ChevronLeft } from 'lucide-react';
import type { AppStep } from '../types';

// ─── Canvas logo SVG (same as rubric app) ─────────────────────────────────────
const CanvasLogo = () => (
  <div className="relative w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100">
    <svg viewBox="0 0 100 100" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
      <g fill="#E63027">
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(45, 50, 50)" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(90, 50, 50)" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(135, 50, 50)" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(180, 50, 50)" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(225, 50, 50)" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(270, 50, 50)" />
        <path d="M 38 14 A 12 12 0 0 0 62 14 Z" transform="rotate(315, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(22.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(67.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(112.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(157.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(202.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(247.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(292.5, 50, 50)" />
        <circle cx="50" cy="28" r="5" transform="rotate(337.5, 50, 50)" />
      </g>
    </svg>
  </div>
);

const WordIcon = () => (
  <div className="w-8 h-8 bg-[#2b579a] rounded flex items-center justify-center text-white font-black text-lg shadow-sm">
    W
  </div>
);

const RightArrow = () => (
  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const IconBox = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-10 h-10 rounded-lg border border-gray-100 shadow-sm flex items-center justify-center bg-white shrink-0 ${className}`}>
    {children}
  </div>
);

// ─── Help panel content ────────────────────────────────────────────────────────
const HelpPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-panel-title"
      className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md mt-16 mr-4 p-8 space-y-6 overflow-y-auto max-h-[80vh]"
    >
      <div className="flex items-center justify-between">
        <h2 id="help-panel-title" className="font-black text-xl text-gray-900">Help Center</h2>
        <button onClick={onClose} aria-label="Close help panel" className="text-gray-600 hover:text-gray-900 font-bold text-lg leading-none">✕</button>
      </div>

      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <div>
          <h3 className="font-black text-gray-900 mb-1">How to get a Canvas API Token</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Log into Canvas.</li>
            <li>Go to <span className="font-bold">Account → Settings</span>.</li>
            <li>Scroll to <span className="font-bold">Approved Integrations</span>.</li>
            <li>Click <span className="font-bold">+ New Access Token</span>.</li>
            <li>Give it a name and click <span className="font-bold">Generate Token</span>.</li>
            <li>Copy the token and paste it into the app.</li>
          </ol>
          <p className="text-gray-500 text-xs mt-2">
            Source:{' '}
            <a
              href="https://community.instructure.com/en/kb/articles/662901-how-do-i-manage-api-access-tokens-in-my-user-account"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              How do I manage API access tokens in my user account?
            </a>
          </p>
        </div>

        <div>
          <h3 className="font-black text-gray-900 mb-1">How to find your Course URL</h3>
          <p className="text-gray-600">Navigate to your Canvas course. Copy the URL from your browser's address bar. It should look like:</p>
          <p className="font-mono text-xs bg-gray-100 rounded p-2 mt-1 break-all">
            https://yourschool.instructure.com/courses/12345
          </p>
        </div>

        <div>
          <h3 className="font-black text-gray-900 mb-1">Supported Question Types</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Multiple Choice</li>
            <li>Multiple Answer (select all that apply)</li>
            <li>True / False</li>
            <li>Essay</li>
          </ul>
          <p className="text-gray-600 mt-2">All other question types are skipped and noted in the output document.</p>
        </div>

        <div>
          <h3 className="font-black text-gray-900 mb-1">New Quizzes</h3>
          <p className="text-gray-600">
            Quizzes created with Canvas's <span className="font-bold">New Quizzes</span> engine cannot be extracted — Canvas does not provide a public API for their question content. These quizzes are listed but flagged as unsupported in the output document.
          </p>
        </div>

        <div>
          <h3 className="font-black text-gray-900 mb-1">Output Format</h3>
          <p className="text-gray-600">
            Questions are exported as a <span className="font-bold">.docx</span> (Word) file organized by quiz and module. The correct answer is marked with an asterisk (<span className="font-mono font-bold">*</span>) before the answer letter.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Find Bugs? Have Improvement Requests?</p>
          <a
            href="https://docs.google.com/document/d/1OaJnIfxhQQMQTWl7jYkmXVl-81az53CYMAHg_xyFQO8/edit?tab=t.0#heading=h.bz7nzkw7vn22"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 transition-all"
          >
            <span className="font-black text-gray-900 text-sm">App Suggestions Document</span>
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <p className="text-sm font-black text-gray-900 flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              AI Models Used
            </p>
            <p className="text-sm text-gray-600 ml-6">None — this app uses only the Canvas API.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Layout ───────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
  step: AppStep;
  onReturnToDashboard?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, step, onReturnToDashboard }) => {
  const [helpOpen, setHelpOpen] = React.useState(false);

  const getRibbonContent = () => {
    const base = 'flex items-center gap-3';
    switch (step) {
      case 'setup':
        return (
          <div className={base}>
            <IconBox><CanvasLogo /></IconBox>
            <RightArrow />
            <IconBox><WordIcon /></IconBox>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <span className="text-sm font-black text-gray-600 uppercase tracking-widest">Setup</span>
          </div>
        );
      case 'quiz-selection':
        return (
          <div className={base}>
            <IconBox><CanvasLogo /></IconBox>
            <span className="text-sm font-black uppercase tracking-widest ml-2">
              <span className="text-[#c0392b]">Step 1: </span>
              <span className="text-gray-900">Select Quizzes</span>
            </span>
          </div>
        );
      case 'extracting':
        return (
          <div className={base}>
            <IconBox><CanvasLogo /></IconBox>
            <RightArrow />
            <IconBox><WordIcon /></IconBox>
            <span className="text-sm font-black uppercase tracking-widest ml-2">
              <span className="text-[#c0392b]">Step 2: </span>
              <span className="text-gray-900">Extracting Questions</span>
            </span>
          </div>
        );
      case 'complete':
        return (
          <div className={base}>
            <IconBox><CanvasLogo /></IconBox>
            <RightArrow />
            <IconBox><WordIcon /></IconBox>
            <span className="text-sm font-black uppercase tracking-widest ml-2">
              <span className="text-green-600">Complete: </span>
              <span className="text-gray-900">Ready to Download</span>
            </span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative overflow-hidden">
      {/* ── Blue header banner ── */}
      <div className="bg-[#0033a0] text-white py-6 px-8 sm:px-12 flex items-center justify-between shadow-lg z-50">
        <div>
          <h1 className="text-xl font-black">eCampus Canvas Quiz Extractor</h1>
          <p className="text-xs text-blue-100">Extract Classic Quiz questions to a Word document</p>
        </div>
      </div>

      {/* ── White ribbon bar ── */}
      <div className="bg-white border-b border-gray-200 py-3 px-8 sm:px-12 flex items-center justify-between shadow-sm z-40">
        <div className="hidden sm:flex">
          {getRibbonContent()}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all font-bold text-sm border border-gray-200 active:scale-95"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help Center & More</span>
          </button>

          {step !== 'setup' && onReturnToDashboard && (
            <button
              onClick={onReturnToDashboard}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
        {children}
      </main>

      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
    </div>
  );
};
