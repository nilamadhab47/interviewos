import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import QuestionPicker from '@/components/questions/QuestionPicker';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { ApiError } from '@/lib/api';
import type { Question } from '@/types/question';
import { LANGUAGES } from '@interviewos/shared';

export default function ScheduleInterviewPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const { createSession, isLoading } = useSessionStore();

  const [title, setTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!candidateName.trim()) {
      setFormError('Please enter the candidate’s name.');
      return;
    }

    if (!accessToken) return;

    try {
      const result = await createSession(
        {
          title: title.trim() || undefined,
          language,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim() || undefined,
          questionId: selectedQuestion?.id,
        },
        accessToken,
      );
      navigate(`/session/${result.session.id}`, {
        state: selectedQuestion ? { scheduledQuestion: selectedQuestion } : undefined,
      });
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Could not schedule the interview. Please try again.',
      );
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to interviews
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Schedule New Interview</h1>
        <p className="text-text-secondary mt-1">
          Set up the interview details and choose a question from your bank.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 md:p-8 space-y-8 max-w-2xl">
        {formError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {formError}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Interview details
          </h2>
          <Input
            id="title"
            label="Interview title"
            placeholder="Frontend Engineer — Round 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="candidateName"
              label="Candidate name"
              placeholder="Jane Smith"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              required
            />
            <Input
              id="candidateEmail"
              label="Candidate email (optional)"
              type="email"
              placeholder="jane@example.com"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Default language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-bg-card border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {accessToken && (
          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Coding question
            </h2>
            <QuestionPicker
              accessToken={accessToken}
              selectedId={selectedQuestion?.id ?? null}
              onSelect={setSelectedQuestion}
            />
            <p className="text-xs text-text-muted">
              Need a new question?{' '}
              <Link to="/dashboard/questions/new" className="text-accent-glow hover:underline">
                Add one to your question bank
              </Link>
            </p>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" disabled={isLoading} className="sm:flex-1">
            {isLoading ? (
              'Scheduling...'
            ) : (
              <>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Schedule &amp; Join Interview
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" to="/dashboard">
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
