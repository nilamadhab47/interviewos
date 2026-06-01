import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, AlertCircle, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import type { Question } from '@/types/question';
import { difficultyBadgeClass } from '@/types/question';

interface QuestionPickerProps {
  accessToken: string;
  selectedId: string | null;
  onSelect: (question: Question | null) => void;
}

export default function QuestionPicker({
  accessToken,
  selectedId,
  onSelect,
}: QuestionPickerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api<Question[]>('/api/questions', { token: accessToken });
      setQuestions(list);
    } catch {
      setError('Could not load the question bank.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const selected = questions.find((q) => q.id === selectedId) ?? null;

  const filtered = questions.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-text-secondary">
          Question from bank
        </label>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Clear selection
          </button>
        )}
      </div>

      {selected && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-accent-glow shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{selected.title}</p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                  difficultyBadgeClass[selected.difficulty] || 'text-text-muted bg-bg-card'
                }`}
              >
                {selected.difficulty}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search your question bank..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-bg-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <div className="rounded-xl border border-border bg-bg-card/30 max-h-64 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-400 p-4 text-center">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">
              {questions.length === 0
                ? 'Your question bank is empty. Add questions first.'
                : 'No questions match your search.'}
            </p>
          </div>
        ) : (
          <ul className="p-1">
            {filtered.map((q) => {
              const isSelected = q.id === selectedId;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(isSelected ? null : q)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-bg-card-hover border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium flex-1 truncate">{q.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                          difficultyBadgeClass[q.difficulty] || ''
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-accent-glow shrink-0" />
                      )}
                    </div>
                    {q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {q.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-[10px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-text-muted">
        Optional: pick a coding question now. You can also change it during the interview.
      </p>
    </div>
  );
}
