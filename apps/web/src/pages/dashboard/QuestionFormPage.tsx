import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { api, ApiError } from '@/lib/api';
import { DIFFICULTY_OPTIONS } from '@/types/question';
import { LANGUAGES, getLanguageById } from '@interviewos/shared';

interface TestCaseRow {
  input: string;
  expected: string;
}

export default function QuestionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [tagsInput, setTagsInput] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [starterCode, setStarterCode] = useState(
    getLanguageById('javascript')?.defaultCode || '',
  );
  const [defaultCodeMap, setDefaultCodeMap] = useState<Record<string, string>>({});
  const [testCases, setTestCases] = useState<TestCaseRow[]>([{ input: '', expected: '' }]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id || !accessToken) return;

    setLoading(true);
    api<{
      title: string;
      description: string;
      difficulty: string;
      tags: string[];
      defaultCode: Record<string, string>;
      testCases: TestCaseRow[];
    }>(`/api/questions/${id}`, { token: accessToken })
      .then((q) => {
        setTitle(q.title);
        setDescription(q.description);
        setDifficulty(
          (['easy', 'medium', 'hard'].includes(q.difficulty)
            ? q.difficulty
            : 'medium') as 'easy' | 'medium' | 'hard',
        );
        setTagsInput(q.tags.join(', '));
        setDefaultCodeMap(q.defaultCode || {});
        const jsCode = q.defaultCode?.javascript || getLanguageById('javascript')?.defaultCode || '';
        setStarterCode(jsCode);
        setTestCases(
          q.testCases.length > 0 ? q.testCases : [{ input: '', expected: '' }],
        );
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load question.');
      })
      .finally(() => setLoading(false));
  }, [isEdit, id, accessToken]);

  function handleLanguageChange(langId: string) {
    const current = starterCode;
    setDefaultCodeMap((prev) => ({ ...prev, [codeLanguage]: current }));
    setCodeLanguage(langId);
    const next =
      defaultCodeMap[langId] ?? getLanguageById(langId)?.defaultCode ?? '';
    setStarterCode(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    const defaultCode = {
      ...defaultCodeMap,
      [codeLanguage]: starterCode,
    };

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      difficulty,
      tags,
      defaultCode,
      testCases: testCases.filter((tc) => tc.input.trim() || tc.expected.trim()),
    };

    setSaving(true);
    setError(null);

    try {
      if (isEdit && id) {
        await api(`/api/questions/${id}`, {
          method: 'PUT',
          body: payload,
          token: accessToken,
        });
      } else {
        await api('/api/questions', {
          method: 'POST',
          body: payload,
          token: accessToken,
        });
      }
      navigate('/dashboard/questions');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save question.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-muted">Loading question...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        to="/dashboard/questions"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to question bank
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{isEdit ? 'Edit Question' : 'Add Question'}</h1>
        <p className="text-text-secondary mt-1">
          {isEdit
            ? 'Update this coding problem for your interviews.'
            : 'Create a new problem for interviewers to select when scheduling.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <Input
          id="title"
          label="Title"
          placeholder="Two Sum"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem, constraints, and examples..."
            className="w-full px-4 py-3 rounded-lg bg-bg-card border border-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y min-h-[160px]"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="difficulty"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Difficulty
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')
              }
              className="w-full px-4 py-2.5 rounded-lg bg-bg-card border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="tags"
            label="Tags (comma-separated)"
            placeholder="arrays, hash-map"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Starter code
            </label>
            <select
              value={codeLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs px-2 py-1 rounded bg-bg-card border border-border text-text-primary"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={10}
            value={starterCode}
            onChange={(e) => setStarterCode(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-bg-card border border-border text-text-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-secondary">Example test cases</span>
            <button
              type="button"
              onClick={() => setTestCases((prev) => [...prev, { input: '', expected: '' }])}
              className="inline-flex items-center gap-1 text-xs text-accent-glow hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add example
            </button>
          </div>
          <div className="space-y-3">
            {testCases.map((tc, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-bg-card/40"
              >
                <div>
                  <label className="text-[11px] text-text-muted mb-1 block">Input</label>
                  <input
                    value={tc.input}
                    onChange={(e) => {
                      const next = [...testCases];
                      next[index] = { ...next[index], input: e.target.value };
                      setTestCases(next);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-sm font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-text-muted mb-1 block">Expected output</label>
                    <input
                      value={tc.expected}
                      onChange={(e) => {
                        const next = [...testCases];
                        next[index] = { ...next[index], expected: e.target.value };
                        setTestCases(next);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-sm font-mono"
                    />
                  </div>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== index))}
                      className="self-end p-2 text-text-muted hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add to Question Bank'}
          </Button>
          <Button type="button" variant="ghost" to="/dashboard/questions">
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
