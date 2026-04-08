import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  ArrowLeft,
  Clipboard,
  Eye,
  Zap,
  Activity,
  Terminal,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';

interface Snapshot {
  id: number;
  code: string;
  language: string;
  trigger: string;
  createdAt: string;
}

interface TimelineEvent {
  id: number;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface ReplayData {
  session: {
    id: string;
    title: string;
    status: string;
    language: string;
    startedAt: string | null;
    endedAt: string | null;
    participants: Array<{ id: string; name: string; role: string }>;
  };
  snapshots: Snapshot[];
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<string, typeof Clipboard> = {
  paste: Clipboard,
  tab_switch: Eye,
  compile: Terminal,
  keystroke_burst: Activity,
  idle_start: Clock,
};

const EVENT_COLORS: Record<string, string> = {
  paste: 'bg-amber-400',
  tab_switch: 'bg-red-400',
  compile: 'bg-emerald-400',
  keystroke_burst: 'bg-accent-glow',
  idle_start: 'bg-zinc-500',
  idle_end: 'bg-zinc-500',
};

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();

  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch replay data
  useEffect(() => {
    if (!id || !accessToken) return;
    setLoading(true);
    api<ReplayData>(`/api/replay/${id}`, { token: accessToken })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load replay');
        setLoading(false);
      });
  }, [id, accessToken]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !data) return;
    playTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= data.snapshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, data]);

  // Timeline range
  const timeRange = useMemo(() => {
    if (!data) return { start: 0, end: 0, duration: 0 };
    const times = [
      ...data.snapshots.map((s) => new Date(s.createdAt).getTime()),
      ...data.events.map((e) => new Date(e.createdAt).getTime()),
    ];
    if (times.length === 0) return { start: 0, end: 0, duration: 0 };
    const start = Math.min(...times);
    const end = Math.max(...times);
    return { start, end, duration: end - start };
  }, [data]);

  const currentSnapshot = data?.snapshots[currentIndex] ?? null;

  // Events near current snapshot
  const nearbyEvents = useMemo(() => {
    if (!data || !currentSnapshot) return [];
    const snapTime = new Date(currentSnapshot.createdAt).getTime();
    const prevSnapTime =
      currentIndex > 0
        ? new Date(data.snapshots[currentIndex - 1].createdAt).getTime()
        : timeRange.start;

    return data.events.filter((e) => {
      const t = new Date(e.createdAt).getTime();
      return t >= prevSnapTime && t <= snapTime;
    });
  }, [data, currentSnapshot, currentIndex, timeRange.start]);

  // Format time relative to session start
  function formatRelativeTime(dateStr: string): string {
    const ms = new Date(dateStr).getTime() - timeRange.start;
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${String(s).padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-muted">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'No replay data found'}</p>
          <Link to="/dashboard" className="text-sm text-accent-glow hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const candidate = data.session.participants.find((p) => p.role === 'candidate');

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary/50 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-accent-glow" />
            <span className="text-sm font-semibold">
              Replay: {data.session.title || 'Untitled Session'}
            </span>
          </div>
          {candidate && (
            <span className="text-xs text-text-muted bg-bg-card px-2 py-0.5 rounded">
              {candidate.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{data.snapshots.length} snapshots</span>
          <span>{data.events.length} events</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language={currentSnapshot?.language || data.session.language}
              value={currentSnapshot?.code || '// No code snapshot available'}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>

          {/* Playback controls + timeline */}
          <div className="border-t border-border bg-bg-secondary/50 px-4 py-3">
            {/* Controls */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setCurrentIndex(0)}
                className="p-1.5 rounded hover:bg-bg-card-hover text-text-muted hover:text-text-primary transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-lg bg-accent hover:bg-accent/80 text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(currentIndex + 1, data.snapshots.length - 1))}
                className="p-1.5 rounded hover:bg-bg-card-hover text-text-muted hover:text-text-primary transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-muted ml-2">
                {currentSnapshot ? formatRelativeTime(currentSnapshot.createdAt) : '0:00'}
              </span>
              <span className="text-[10px] text-text-muted">
                ({currentIndex + 1} / {data.snapshots.length})
              </span>
              {currentSnapshot?.trigger && (
                <span className="text-[10px] bg-bg-card px-2 py-0.5 rounded text-text-muted capitalize">
                  {currentSnapshot.trigger}
                </span>
              )}
            </div>

            {/* Timeline slider */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={Math.max(data.snapshots.length - 1, 0)}
                value={currentIndex}
                onChange={(e) => {
                  setCurrentIndex(parseInt(e.target.value, 10));
                  setIsPlaying(false);
                }}
                className="w-full h-1.5 rounded-full appearance-none bg-bg-card cursor-pointer accent-accent"
              />
              {/* Event markers on timeline */}
              {timeRange.duration > 0 && (
                <div className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none">
                  {data.events
                    .filter((e) => ['paste', 'tab_switch', 'compile'].includes(e.eventType))
                    .map((e) => {
                      const pos =
                        ((new Date(e.createdAt).getTime() - timeRange.start) / timeRange.duration) * 100;
                      return (
                        <div
                          key={e.id}
                          className={`absolute top-0 w-1.5 h-1.5 rounded-full ${EVENT_COLORS[e.eventType] || 'bg-zinc-500'}`}
                          style={{ left: `${pos}%` }}
                          title={`${e.eventType} at ${formatRelativeTime(e.createdAt)}`}
                        />
                      );
                    })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-2">
              <LegendItem color="bg-amber-400" label="Paste" />
              <LegendItem color="bg-red-400" label="Tab Switch" />
              <LegendItem color="bg-emerald-400" label="Compile" />
            </div>
          </div>
        </div>

        {/* Right sidebar — event log */}
        <div className="w-72 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-text-secondary">Event Log</h3>
            <p className="text-[10px] text-text-muted mt-1">
              Events between snapshots {currentIndex} → {currentIndex + 1}
            </p>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-1.5">
            {nearbyEvents.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No events in this range</p>
            ) : (
              nearbyEvents.map((e) => {
                const Icon = EVENT_ICONS[e.eventType] || Activity;
                return (
                  <div
                    key={e.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-bg-card/50 border border-border"
                  >
                    <div className={`mt-0.5 ${e.eventType === 'paste' || e.eventType === 'tab_switch' ? 'text-amber-400' : 'text-text-muted'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium capitalize">
                        {e.eventType.replace('_', ' ')}
                      </div>
                      {e.payload && Object.keys(e.payload).length > 0 && (
                        <div className="text-[10px] text-text-muted mt-0.5 font-mono truncate">
                          {JSON.stringify(e.payload)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0">
                      {formatRelativeTime(e.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}
