import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle,
  AlertCircle,
  Tag,
  Maximize2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Question } from '@/types/question';
import { difficultyBadgeClass } from '@/types/question';

function QuestionDetailBody({
  question,
  compact = false,
}: {
  question: Question;
  compact?: boolean;
}) {
  const examples = compact ? question.testCases.slice(0, 3) : question.testCases;

  return (
    <>
      <div className="flex items-start gap-3 flex-wrap">
        <h4
          className={
            compact
              ? 'text-sm font-medium'
              : 'text-xl sm:text-2xl font-semibold text-text-primary'
          }
        >
          {question.title}
        </h4>
        <span
          className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
            difficultyBadgeClass[question.difficulty] || 'text-text-muted bg-bg-card'
          }`}
        >
          {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
        </span>
      </div>

      <div
        className={
          compact
            ? 'text-xs text-text-secondary leading-relaxed max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-bg-card/50 p-3 border border-border'
            : 'text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-wrap rounded-xl bg-bg-card/50 p-4 sm:p-5 border border-border'
        }
      >
        {question.description}
      </div>

      {examples.length > 0 && (
        <div className="space-y-2">
          <span
            className={
              compact
                ? 'text-[11px] font-medium text-text-muted'
                : 'text-sm font-semibold text-text-primary'
            }
          >
            Examples &amp; test cases
          </span>
          <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
            {examples.map((tc, i) => (
              <div
                key={i}
                className={
                  compact
                    ? 'rounded-lg bg-bg-card/50 border border-border p-2 text-[11px] font-mono'
                    : 'rounded-xl bg-bg-card/50 border border-border p-4 text-sm font-mono space-y-2'
                }
              >
                <div className="text-text-muted">
                  <span className="text-text-secondary font-sans font-medium">Input: </span>
                  <span className="text-text-primary">{tc.input}</span>
                </div>
                <div className="text-text-muted">
                  <span className="text-text-secondary font-sans font-medium">Expected: </span>
                  <span className="text-emerald-400">{tc.expected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-bg-card border border-border text-text-muted"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function QuestionFullScreenModal({
  question,
  onClose,
}: {
  question: Question;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-bg-primary/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
          <span id="question-modal-title" className="text-sm font-semibold text-text-primary truncate">
            Problem statement
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <QuestionDetailBody question={question} />
        </div>
      </div>
    </div>
  );
}

interface QuestionPanelProps {
  sessionId: string;
  accessToken: string;
  currentQuestionId?: string | null;
  /** Preloaded from session page (schedule flow or parent fetch) */
  attachedQuestion?: Question | null;
  isInterviewer: boolean;
  language: string;
  onQuestionSelected?: (question: Question) => void;
}

export default function QuestionPanel({
  sessionId,
  accessToken,
  currentQuestionId,
  attachedQuestion,
  isInterviewer,
  language,
  onQuestionSelected,
}: QuestionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showFullQuestion, setShowFullQuestion] = useState(false);
  const [isResettingStarter, setIsResettingStarter] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefer question preloaded by SessionPage; fall back to session-scoped fetch
  useEffect(() => {
    if (attachedQuestion) {
      setSelectedQuestion(attachedQuestion);
      return;
    }

    if (!currentQuestionId || !accessToken) {
      setSelectedQuestion(null);
      return;
    }

    let cancelled = false;

    api<Question>(`/api/sessions/${sessionId}/question`, { token: accessToken })
      .then((question) => {
        if (!cancelled) setSelectedQuestion(question);
      })
      .catch(() => {
        if (!cancelled) setSelectedQuestion(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attachedQuestion, currentQuestionId, accessToken, sessionId]);

  useEffect(() => {
    setShowFullQuestion(false);
  }, [selectedQuestion?.id]);

  // Fetch question bank when picker opens
  const fetchQuestions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const list = await api<Question[]>('/api/questions', { token: accessToken });
      setQuestions(list);
    } catch (err) {
      console.error('[Questions] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (showPicker) fetchQuestions();
  }, [showPicker, fetchQuestions]);

  const filteredQuestions = questions.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  async function handleResetStarter() {
    if (!isInterviewer || !sessionId) return;
    setIsResettingStarter(true);
    setResetMessage(null);
    try {
      await api(`/api/sessions/${sessionId}/editor/reset-starter`, {
        method: 'POST',
        token: accessToken,
      });
      setResetMessage('Editor reset to starter code');
      setTimeout(() => setResetMessage(null), 3000);
    } catch {
      setResetMessage('Failed to reset editor');
    } finally {
      setIsResettingStarter(false);
    }
  }

  async function handleSelect(question: Question) {
    setSelectedQuestion(question);
    setShowPicker(false);
    onQuestionSelected?.(question);

    if (isInterviewer) {
      try {
        await api(`/api/sessions/${sessionId}/question`, {
          method: 'PATCH',
          body: { questionId: question.id },
          token: accessToken,
        });
      } catch (err) {
        console.error('[Question] Failed to attach question:', err);
      }
    }
  }

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-bg-card-hover transition-colors"
      >
        <FileText className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold flex-1 text-left">Question</span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {selectedQuestion ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-3">
                  <QuestionDetailBody question={selectedQuestion} compact />
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!isInterviewer && (
                    <button
                      type="button"
                      onClick={() => setShowFullQuestion(true)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border text-[11px] text-text-secondary hover:text-accent-glow transition-colors"
                      title="Expand question"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Expand
                    </button>
                  )}
                  {isInterviewer && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        className="text-[11px] text-accent-glow hover:underline text-left"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleResetStarter}
                        disabled={isResettingStarter}
                        className="text-[11px] text-amber-400 hover:underline text-left disabled:opacity-50"
                        title="Replace editor content with question starter for everyone"
                      >
                        {isResettingStarter ? 'Resetting…' : 'Reset starter'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {resetMessage && (
                <p className="text-[11px] text-text-muted">{resetMessage}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              {isInterviewer ? (
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-2 mx-auto px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border text-xs text-text-secondary transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Select a Question
                </button>
              ) : (
                <p className="text-xs text-text-muted">No question selected yet</p>
              )}
            </div>
          )}

          {showFullQuestion &&
            selectedQuestion &&
            createPortal(
              <QuestionFullScreenModal
                question={selectedQuestion}
                onClose={() => setShowFullQuestion(false)}
              />,
              document.body,
            )}

          {/* Question picker modal */}
          {showPicker && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="w-full max-w-lg mx-4 bg-bg-secondary rounded-xl border border-border shadow-2xl max-h-[70vh] flex flex-col">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold mb-3">Select Question</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-sm text-text-muted">
                        {questions.length === 0
                          ? 'No questions in your bank yet'
                          : 'No matching questions'}
                      </p>
                      {questions.length === 0 && (
                        <Link
                          to="/dashboard/questions/new"
                          className="inline-block mt-3 text-xs text-accent-glow hover:underline"
                        >
                          Add a question to your bank
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredQuestions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => handleSelect(q)}
                          className={`w-full text-left p-3 rounded-lg hover:bg-bg-card-hover transition-colors ${
                            q.id === selectedQuestion?.id
                              ? 'bg-accent/10 border border-accent/30'
                              : 'border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium flex-1">{q.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                difficultyBadgeClass[q.difficulty] || ''
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            {q.id === selectedQuestion?.id && (
                              <CheckCircle className="w-4 h-4 text-accent-glow" />
                            )}
                          </div>
                          {q.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {q.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border flex justify-end">
                  <button
                    onClick={() => setShowPicker(false)}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
