import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  defaultCode: Record<string, string>;
  testCases: Array<{ input: string; expected: string }>;
  tags: string[];
  isPublic: boolean;
}

interface QuestionPanelProps {
  sessionId: string;
  accessToken: string;
  currentQuestionId?: string | null;
  isInterviewer: boolean;
  language: string;
  onQuestionSelected?: (question: Question) => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  hard: 'text-red-400 bg-red-400/10',
};

export default function QuestionPanel({
  sessionId,
  accessToken,
  currentQuestionId,
  isInterviewer,
  language,
  onQuestionSelected,
}: QuestionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch current question if set
  useEffect(() => {
    if (currentQuestionId && accessToken) {
      api<Question>(`/api/questions/${currentQuestionId}`, { token: accessToken })
        .then(setSelectedQuestion)
        .catch(console.error);
    }
  }, [currentQuestionId, accessToken]);

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

  function handleSelect(question: Question) {
    setSelectedQuestion(question);
    setShowPicker(false);
    onQuestionSelected?.(question);
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
              {/* Question header */}
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium">{selectedQuestion.title}</h4>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-1 ${
                      difficultyColors[selectedQuestion.difficulty] || 'text-text-muted bg-bg-card'
                    }`}
                  >
                    {selectedQuestion.difficulty.charAt(0).toUpperCase() +
                      selectedQuestion.difficulty.slice(1)}
                  </span>
                </div>
                {isInterviewer && (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="text-[11px] text-accent-glow hover:underline shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="text-xs text-text-secondary leading-relaxed max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-bg-card/50 p-3 border border-border">
                {selectedQuestion.description}
              </div>

              {/* Test cases */}
              {selectedQuestion.testCases.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Examples</span>
                  {selectedQuestion.testCases.slice(0, 3).map((tc, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-bg-card/50 border border-border p-2 text-[11px] font-mono"
                    >
                      <div className="text-text-muted">
                        Input: <span className="text-text-secondary">{tc.input}</span>
                      </div>
                      <div className="text-text-muted">
                        Expected: <span className="text-emerald-400">{tc.expected}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {selectedQuestion.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedQuestion.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-bg-card border border-border text-text-muted"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
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
                                difficultyColors[q.difficulty] || ''
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
