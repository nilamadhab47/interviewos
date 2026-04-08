import { useState, useEffect } from 'react';
import {
  Activity,
  Clipboard,
  Eye,
  Keyboard,
  Zap,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { TelemetrySummary } from '@interviewos/shared';
import { getSocket } from '@/lib/socket';

interface TelemetryDashboardProps {
  sessionId: string;
}

interface Flag {
  type: 'paste' | 'tab' | 'wpm';
  message: string;
  at: Date;
}

export default function TelemetryDashboard({ sessionId }: TelemetryDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [summary, setSummary] = useState<TelemetrySummary>({
    totalKeystrokes: 0,
    compileCount: 0,
    pasteCount: 0,
    tabSwitchCount: 0,
    currentWpm: 0,
    isIdle: false,
    idleDurationMs: 0,
  });
  const [flags, setFlags] = useState<Flag[]>([]);
  const prevSummaryRef = { current: summary };

  useEffect(() => {
    const socket = getSocket();

    const handleSummary = (data: TelemetrySummary) => {
      const prev = prevSummaryRef.current;

      // Detect new flags based on deltas
      const newFlags: Flag[] = [];

      if (data.pasteCount > prev.pasteCount) {
        newFlags.push({ type: 'paste', message: 'Large paste detected', at: new Date() });
      }
      if (data.tabSwitchCount > prev.tabSwitchCount) {
        newFlags.push({ type: 'tab', message: 'Tab switch detected', at: new Date() });
      }
      if (data.currentWpm > 200) {
        newFlags.push({ type: 'wpm', message: `WPM spike: ${data.currentWpm}`, at: new Date() });
      }

      if (newFlags.length > 0) {
        setFlags((prev) => [...newFlags, ...prev].slice(0, 10)); // keep last 10
      }

      prevSummaryRef.current = data;
      setSummary(data);
    };

    socket.on('telemetry:summary', handleSummary);
    return () => { socket.off('telemetry:summary', handleSummary); };
  }, [sessionId]);

  const wpmColor =
    summary.currentWpm > 200
      ? 'text-red-400'
      : summary.currentWpm > 100
        ? 'text-amber-400'
        : 'text-emerald-400';

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-bg-card-hover transition-colors"
      >
        <Activity className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold flex-1 text-left">Candidate Activity</span>
        {summary.isIdle && (
          <span className="text-[10px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded">
            Idle
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={<Keyboard className="w-3.5 h-3.5" />}
              label="Keystrokes"
              value={summary.totalKeystrokes.toLocaleString()}
              color="text-accent-glow"
            />
            <MetricCard
              icon={<Zap className="w-3.5 h-3.5" />}
              label="WPM"
              value={String(summary.currentWpm)}
              color={wpmColor}
            />
            <MetricCard
              icon={<Clipboard className="w-3.5 h-3.5" />}
              label="Pastes"
              value={String(summary.pasteCount)}
              color={summary.pasteCount > 0 ? 'text-amber-400' : 'text-text-muted'}
            />
            <MetricCard
              icon={<Eye className="w-3.5 h-3.5" />}
              label="Tab Switches"
              value={String(summary.tabSwitchCount)}
              color={summary.tabSwitchCount > 3 ? 'text-red-400' : summary.tabSwitchCount > 0 ? 'text-amber-400' : 'text-text-muted'}
            />
            <MetricCard
              icon={<Activity className="w-3.5 h-3.5" />}
              label="Compiles"
              value={String(summary.compileCount)}
              color="text-text-secondary"
            />
            <MetricCard
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Status"
              value={summary.isIdle ? 'Idle' : 'Active'}
              color={summary.isIdle ? 'text-amber-400' : 'text-emerald-400'}
            />
          </div>

          {/* WPM bar */}
          {summary.currentWpm > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-text-muted mb-1">
                <span>Typing speed</span>
                <span className={wpmColor}>{summary.currentWpm} WPM</span>
              </div>
              <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.currentWpm > 200
                      ? 'bg-red-500'
                      : summary.currentWpm > 100
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (summary.currentWpm / 250) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Flags */}
          {flags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium text-amber-400">
                  Flags ({flags.length})
                </span>
              </div>
              <div className="space-y-1 max-h-24 overflow-auto">
                {flags.map((flag, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-amber-400/5 border border-amber-400/20"
                  >
                    <FlagIcon type={flag.type} />
                    <span className="flex-1 text-text-secondary">{flag.message}</span>
                    <span className="text-text-muted">
                      {flag.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-bg-card/50 border border-border">
      <div className={`flex items-center gap-1 ${color}`}>{icon}</div>
      <div className={`text-base font-bold leading-none ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted">{label}</div>
    </div>
  );
}

function FlagIcon({ type }: { type: Flag['type'] }) {
  if (type === 'paste') return <Clipboard className="w-3 h-3 text-amber-400 shrink-0" />;
  if (type === 'tab') return <Eye className="w-3 h-3 text-amber-400 shrink-0" />;
  return <Zap className="w-3 h-3 text-red-400 shrink-0" />;
}
