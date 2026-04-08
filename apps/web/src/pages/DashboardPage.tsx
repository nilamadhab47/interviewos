import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Code2,
  LogOut,
  Copy,
  Check,
  Clock,
  Users,
  Play,
  Circle,
  ExternalLink,
  RotateCcw,
  Filter,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { api } from '@/lib/api';

interface SessionListItem {
  id: string;
  title: string | null;
  status: string;
  language: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  participants: Array<{ id: string; name: string; role: string; joinedAt: string | null }>;
}

const STATUS_OPTIONS = ['all', 'created', 'active', 'completed', 'archived'] as const;

const statusConfig: Record<string, { color: string; label: string }> = {
  created: { color: 'text-yellow-400 bg-yellow-400/10', label: 'Created' },
  waiting: { color: 'text-amber-400 bg-amber-400/10', label: 'Waiting' },
  active: { color: 'text-green-400 bg-green-400/10', label: 'Active' },
  completed: { color: 'text-zinc-400 bg-zinc-400/10', label: 'Completed' },
  archived: { color: 'text-zinc-600 bg-zinc-600/10', label: 'Archived' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuthStore();
  const { createSession, isLoading: createLoading } = useSessionStore();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Redirect if not logged in
  if (!user || !accessToken) {
    navigate('/login');
    return null;
  }

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const list = await api<SessionListItem[]>(`/api/sessions${params}`, {
        token: accessToken!,
      });
      setSessions(list);
    } catch {
      // silently fail
    } finally {
      setSessionsLoading(false);
    }
  }, [accessToken, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleCreate() {
    try {
      const result = await createSession(
        { title: title || undefined, language, candidateName, candidateEmail },
        accessToken!,
      );
      if (result.candidateJoinUrl) {
        setCreatedLink(`${window.location.origin}${result.candidateJoinUrl}`);
      }
      navigate(`/session/${result.session.id}`);
    } catch {
      // Error handled in store
    }
  }

  function handleCopy() {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDuration(startedAt: string | null, endedAt: string | null): string {
    if (!startedAt) return '--';
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const mins = Math.round((end - start) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Top bar */}
      <header className="glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">
              Interview<span className="text-accent-glow">OS</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-text-secondary mt-1">
                Create and manage your interview sessions
              </p>
            </div>
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>

          {/* Create session form */}
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="glass rounded-2xl p-6 mb-8"
            >
              <h2 className="text-lg font-semibold mb-4">Create Interview Session</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="title"
                  label="Session Title"
                  placeholder="Frontend Engineer Interview"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-card border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                  </select>
                </div>
                <Input
                  id="candidateName"
                  label="Candidate Name"
                  placeholder="Jane Smith"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
                <Input
                  id="candidateEmail"
                  label="Candidate Email (optional)"
                  type="email"
                  placeholder="jane@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={handleCreate} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create & Join Session'}
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>

              {createdLink && (
                <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-3">
                  <span className="text-sm text-accent-glow flex-1 truncate font-mono">
                    {createdLink}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-border pb-3">
            <Filter className="w-4 h-4 text-text-muted mr-2" />
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-accent/10 text-accent-glow'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-card-hover'
                }`}
              >
                {s}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={fetchSessions}
              className="p-1.5 rounded hover:bg-bg-card-hover text-text-muted hover:text-text-primary transition-colors"
              title="Refresh"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Session list */}
          {sessionsLoading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-muted">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-bg-card-hover flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-secondary">
                {statusFilter === 'all' ? 'No sessions yet' : `No ${statusFilter} sessions`}
              </h3>
              <p className="text-text-muted mt-2 text-sm">
                Create your first interview session to get started
              </p>
              <Button className="mt-6" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const cfg = statusConfig[s.status] || statusConfig.created;
                const candidate = s.participants.find((p) => p.role === 'candidate');

                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-bg-card-hover/50 transition-colors group"
                  >
                    {/* Status dot */}
                    <div className={`shrink-0 ${cfg.color} px-2.5 py-1 rounded-full text-[10px] font-semibold`}>
                      {cfg.label}
                    </div>

                    {/* Session info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {s.title || 'Untitled Session'}
                        </span>
                        <span className="text-[10px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded capitalize">
                          {s.language}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                        <span>{formatDate(s.createdAt)}</span>
                        {candidate && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {candidate.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(s.startedAt, s.endedAt)}
                        </span>
                        <span>
                          {s.participants.length} participant{s.participants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(s.status === 'created' || s.status === 'active') && (
                        <Link
                          to={`/session/${s.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Join
                        </Link>
                      )}
                      {s.status === 'completed' && (
                        <Link
                          to={`/replay/${s.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border text-xs font-medium transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Replay
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
