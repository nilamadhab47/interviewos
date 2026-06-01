import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Library, Tag } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import type { Question } from '@/types/question';
import { difficultyBadgeClass } from '@/types/question';

export default function QuestionBankPage() {
  const { accessToken } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api<Question[]>('/api/questions', { token: accessToken });
      setQuestions(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  async function handleDelete(id: string, title: string) {
    if (!accessToken) return;
    if (!window.confirm(`Delete "${title}" from your question bank?`)) return;

    try {
      await api(`/api/questions/${id}`, { method: 'DELETE', token: accessToken });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not delete question.');
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-text-secondary mt-1">
            Create and manage coding questions for your interviews.
          </p>
        </div>
        <Button to="/dashboard/questions/new">
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-muted">Loading questions...</p>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center text-red-400 text-sm">{error}</div>
      ) : questions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-bg-card-hover flex items-center justify-center mb-4">
            <Library className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-secondary">No questions yet</h3>
          <p className="text-text-muted mt-2 text-sm max-w-md mx-auto">
            Build your question bank so interviewers can select a problem when scheduling an
            interview.
          </p>
          <Button className="mt-6" to="/dashboard/questions/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Question
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-bg-card-hover/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold">{q.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                      difficultyBadgeClass[q.difficulty] || 'text-text-muted bg-bg-card'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-2 line-clamp-2">{q.description}</p>
                {q.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {q.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] text-text-muted bg-bg-card px-2 py-0.5 rounded-full border border-border"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-text-muted mt-2">
                  {q.testCases.length} example{q.testCases.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/dashboard/questions/${q.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-bg-card-hover transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(q.id, q.title)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
