import React, { useState, useRef } from 'react';
import { Key, Check, X, Eye, EyeOff, Loader2, Link, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { parseCourseUrl } from '../services/canvasService';

interface DashboardProps {
  onConnect: (courseUrl: string, baseUrl: string, courseId: string, token: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onConnect, isLoading, error }) => {
  const [courseUrl, setCourseUrl] = useState('');
  const [courseUrlError, setCourseUrlError] = useState<string | null>(null);

  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSaved, setTokenSaved] = useState(false);
  // Token is stored in a ref (not state) so it never appears in React DevTools.
  // tokenSaved (boolean) is still state so the UI re-renders correctly on save/remove.
  const savedTokenRef = useRef('');

  const [setupOpen, setSetupOpen] = useState(false);

  const maskToken = (t: string) => {
    if (t.length <= 8) return t;
    return t.substring(0, 8) + '...' + t.substring(t.length - 4);
  };

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    if (trimmed.length < 20) {
      setTokenError('Token looks too short — Canvas tokens are usually 64+ characters.');
      return;
    }
    if (/[\s<>"'`]/.test(trimmed)) {
      setTokenError('Token contains invalid characters. Please paste only the token itself.');
      return;
    }
    setTokenError(null);
    savedTokenRef.current = trimmed;
    setTokenSaved(true);
    setTokenInput('');
  };

  const handleRemoveToken = () => {
    savedTokenRef.current = '';
    setTokenSaved(false);
  };

  const handleLoadQuizzes = () => {
    setCourseUrlError(null);

    const trimmedUrl = courseUrl.trim();
    if (!trimmedUrl) {
      setCourseUrlError('Please enter a Canvas course URL.');
      return;
    }

    const parsed = parseCourseUrl(trimmedUrl);
    if (!parsed) {
      setCourseUrlError(
        'Could not parse this URL. It should look like: https://yourschool.instructure.com/courses/12345',
      );
      return;
    }

    if (!tokenSaved) {
      setTokenError('Please save your Canvas API token before loading quizzes.');
      return;
    }

    onConnect(trimmedUrl, parsed.baseUrl, parsed.courseId, savedTokenRef.current);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex gap-8 w-full max-w-5xl">

        {/* ── Main card ── */}
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-gray-100 flex-1">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Quiz Extractor</h2>
            <p className="text-gray-600 font-medium">
              Enter your Canvas course URL to load and extract quiz questions into a Word document.
            </p>
          </div>

          {/* ── Course URL input ── */}
          <div className="mb-6">
            <label htmlFor="course-url" className="flex items-center gap-2 font-black text-gray-800 mb-2">
              <Link className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Canvas Course URL
            </label>
            <input
              id="course-url"
              type="url"
              value={courseUrl}
              onChange={(e) => { setCourseUrl(e.target.value); setCourseUrlError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadQuizzes()}
              placeholder="https://yourschool.instructure.com/courses/12345"
              aria-describedby={courseUrlError ? 'course-url-error' : 'course-url-hint'}
              aria-invalid={!!courseUrlError}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-all font-mono ${
                courseUrlError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#E64C3C]'
              }`}
            />
            {courseUrlError && (
              <p id="course-url-error" role="alert" className="text-xs text-red-600 mt-2 flex items-start gap-1">
                <X className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                {courseUrlError}
              </p>
            )}
            <p id="course-url-hint" className="text-xs text-gray-600 mt-2">
              Navigate to your Canvas course and copy the URL from the address bar.
            </p>
          </div>

          {/* ── Error from parent ── */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-700 text-sm">Connection failed</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* ── Load button ── */}
          <button
            onClick={handleLoadQuizzes}
            disabled={isLoading || !courseUrl.trim() || !tokenSaved}
            className="w-full py-4 bg-[#E64C3C] text-white rounded-2xl font-black text-base hover:bg-[#c0392b] transition-all disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-3 active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting to Canvas…
              </>
            ) : (
              <>
                Load Quizzes
              </>
            )}
          </button>

          {(!tokenSaved && !isLoading) && (
            <p className="text-xs text-amber-700 font-bold text-center mt-3">
              ↑ Save your Canvas API token in the sidebar first.
            </p>
          )}

          {/* ── What this app does ── */}
          <div className="mt-10 pt-8 border-t border-gray-100">
            <h3 className="font-black text-sm text-gray-700 uppercase tracking-widest mb-4">What this app does</h3>
            <ol className="space-y-3">
              {[
                'Scans your Canvas course.',
                'Lists all of the quizzes in the course.',
                'Allows you to select which quizzes and accompanying questions to extract.',
                'Gives you an organized, formatted Word document of the results.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-[#e5eff6] rounded-3xl p-4 shadow-2xl border border-blue-100 space-y-4">

            {/* Initial Setup collapsible */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <button
                onClick={() => setSetupOpen((o) => !o)}
                aria-expanded={setupOpen}
                aria-controls="initial-setup-content"
                className="w-full bg-[#0033a0] flex items-center gap-3 text-left px-4 py-3"
              >
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow flex-shrink-0">
                  <Settings2 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-black text-white text-lg flex-1">Initial Setup</span>
                {setupOpen
                  ? <ChevronUp className="w-5 h-5 text-white flex-shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-white flex-shrink-0" />}
              </button>
              {setupOpen && (
                <div id="initial-setup-content" className="px-4 pt-3 pb-4 text-sm text-gray-600 space-y-2 leading-relaxed">
                  <p>
                    A <span className="font-bold text-gray-800">Canvas API Token</span> is required to read quiz data from your course.
                  </p>
                  <p>
                    Your token is stored only in this browser session and is never sent anywhere except to your Canvas instance.
                  </p>
                  <p>
                    Click <span className="font-bold text-gray-800">Help</span> above to learn how to generate a token.
                  </p>
                </div>
              )}
            </div>

            {/* Canvas API Token card */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-[#E64C3C]" />
                <h3 className="font-black text-lg text-gray-900">Canvas API Token</h3>
              </div>

              {tokenSaved ? (
                <div>
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-bold text-green-700">Token saved</span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono mb-4 break-all">{maskToken(savedTokenRef.current)}</p>
                  <button
                    onClick={handleRemoveToken}
                    className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    Remove Token
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Paste your Canvas personal access token. It never leaves your browser.
                  </p>
                  <div className="relative mb-3">
                    <input
                      id="canvas-token"
                      type={showToken ? 'text' : 'password'}
                      value={tokenInput}
                      onChange={(e) => { setTokenInput(e.target.value); setTokenError(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                      placeholder="Paste your Canvas token here…"
                      aria-label="Canvas API Token"
                      aria-describedby={tokenError ? 'token-error' : undefined}
                      aria-invalid={!!tokenError}
                      autoComplete="off"
                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-mono focus:outline-none transition-all pr-10 ${
                        tokenError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#E64C3C]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      aria-label={showToken ? 'Hide token' : 'Show token'}
                      className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {tokenError && (
                    <p id="token-error" role="alert" className="text-xs text-red-600 mb-3 flex items-start gap-1">
                      <X className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {tokenError}
                    </p>
                  )}
                  <button
                    onClick={handleSaveToken}
                    disabled={!tokenInput.trim()}
                    className="w-full px-4 py-3 bg-[#E64C3C] text-white rounded-xl font-black hover:bg-[#c0392b] transition-all text-sm disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Token
                  </button>
                </div>
              )}
            </div>

            {/* Supported types info card */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
              <h3 className="font-black text-base text-gray-900 mb-3">Supported Question Types</h3>
              <ul className="space-y-2">
                {[
                  { label: 'Multiple Choice', color: 'bg-green-100 text-green-800' },
                  { label: 'Multiple Answer', color: 'bg-green-100 text-green-800' },
                  { label: 'True / False', color: 'bg-green-100 text-green-800' },
                  { label: 'Essay', color: 'bg-green-100 text-green-800' },
                ].map(({ label, color }) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>✓</span>
                    <span className="text-sm text-gray-700">{label}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Other question types are skipped and noted in the output file.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
