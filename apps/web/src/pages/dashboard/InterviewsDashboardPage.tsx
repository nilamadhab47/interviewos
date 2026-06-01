import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Users,
  Play,
  Clock,
  ExternalLink,
  RotateCcw,
  Filter,
  Calendar,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface InterviewListItem {
  id: string;
  title: string | null;
  status: string;
  language: string;
  questionId?: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  participants: Array<{ id: string; name: string; role: string; joinedAt: string | null }>;
}

const STATUS_OPTIONS = ['all', 'created', 'active', 'completed', 'archived'] as const;

const statusConfig: Record<string, { color: string; label: string }> = {
  created: { color: 'text-yellow-400 bg-yellow-400/10', label: 'Scheduled' },
  waiting: { color: 'text-amber-400 bg-amber-400/10', label: 'Waiting' },
  active: { color: 'text-green-400 bg-green-400/10', label: 'In progress' },
  completed: { color: 'text-zinc-400 bg-zinc-400/10', label: 'Completed' },
  archived: { color: 'text-zinc-600 bg-zinc-600/10', label: 'Archived' },
};

export default function InterviewsDashboardPage() {
  const { accessToken } = useAuthStore();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchInterviews = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const list = await api<InterviewListItem[]>(`/api/sessions${params}`, {
        token: accessToken,
      });
      setInterviews(list);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDuration(startedAt: string | null, endedAt: string | null): string {
    if (!startedAt) return '—';
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const mins = Math.round((end - start) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Interviews</h1>
          <p className="text-text-secondary mt-1">
            Schedule technical interviews and manage your upcoming sessions.
          </p>
        </div>
        <Button to="/dashboard/interviews/new">
          <Plus className="w-4 h-4 mr-2" />
          Schedule New Interview
        </Button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-border pb-3 flex-wrap">
        <Filter className="w-4 h-4 text-text-muted mr-2" />
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              statusFilter === s
                ? 'bg-accent/10 text-accent-glow'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-card-hover'
            }`}
          >
            {s === 'all' ? 'All' : s === 'created' ? 'Scheduled' : s}
          </button>
        ))}
        <div className="flex-1 min-w-[1rem]" />
        <button
          type="button"
          onClick={fetchInterviews}
          className="p-1.5 rounded hover:bg-bg-card-hover text-text-muted hover:text-text-primary transition-colors"
          title="Refresh"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-muted">Loading interviews...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-bg-card-hover flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-secondary">
            {statusFilter === 'all' ? 'No interviews scheduled yet' : `No ${statusFilter} interviews`}
          </h3>
          <p className="text-text-muted mt-2 text-sm max-w-sm mx-auto">
            Schedule your first technical interview and invite a candidate with a shareable link.
          </p>
          <Button className="mt-6" to="/dashboard/interviews/new">
            <Plus className="w-4 h-4 mr-2" />
            Schedule New Interview
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((item) => {
            const cfg = statusConfig[item.status] || statusConfig.created;
            const candidate = item.participants.find((p) => p.role === 'candidate');

            return (
              <div
                key={item.id}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-bg-card-hover/50 transition-colors group"
              >
                <div
                  className={`shrink-0 ${cfg.color} px-2.5 py-1 rounded-full text-[10px] font-semibold`}
                >
                  {cfg.label}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {item.title || 'Untitled Interview'}
                    </span>
                    <span className="text-[10px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded capitalize">
                      {item.language}
                    </span>
                    {item.questionId && (
                      <span className="text-[10px] text-emerald-400/90 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                        Question attached
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted flex-wrap">
                    <span>{formatDate(item.createdAt)}</span>
                    {candidate && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {candidate.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(item.startedAt, item.endedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {(item.status === 'created' || item.status === 'active') && (
                    <Link
                      to={`/session/${item.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </Link>
                  )}
                  {item.status === 'completed' && (
                    <Link
                      to={`/replay/${item.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border text-xs font-medium transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Replay
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
