import { Users, Circle, Copy, Check, Clock, StopCircle } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import InterviewerControls from './InterviewerControls';
import QuestionPanel from './QuestionPanel';
import type { Question } from '@/types/question';
import TelemetryDashboard from '@/components/telemetry/TelemetryDashboard';
import type { SessionPermissions } from '@interviewos/shared';

interface Participant {
  id: string;
  name: string;
  role: string;
  joinedAt?: string | null;
}

interface SidebarProps {
  participants: Participant[];
  sessionTitle?: string;
  sessionStatus: string;
  sessionId: string;
  accessToken: string;
  candidateJoinUrl?: string | null;
  isInterviewer: boolean;
  currentQuestionId?: string | null;
  attachedQuestion?: Question | null;
  language: string;
  permissions?: SessionPermissions;
  onStartSession?: () => void;
  onEndSession?: () => void;
  onPermissionsChanged?: (permissions: SessionPermissions) => void;
  onQuestionSelected?: (question: Question) => void;
}

const DEFAULT_PERMISSIONS: SessionPermissions = {
  allowAutocomplete: true,
  allowPaste: true,
  allowAi: false,
  allowRunCode: true,
};

export default function Sidebar({
  participants,
  sessionTitle,
  sessionStatus,
  sessionId,
  accessToken,
  candidateJoinUrl,
  isInterviewer,
  currentQuestionId,
  attachedQuestion,
  language,
  permissions = DEFAULT_PERMISSIONS,
  onStartSession,
  onEndSession,
  onPermissionsChanged,
  onQuestionSelected,
}: SidebarProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    if (candidateJoinUrl) {
      navigator.clipboard.writeText(`${window.location.origin}${candidateJoinUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const statusColors: Record<string, string> = {
    created: 'text-yellow-400',
    waiting: 'text-amber-400',
    active: 'text-green-400',
    completed: 'text-text-muted',
  };

  return (
    <div className="w-full glass flex flex-col h-full">
      {/* Session info */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold truncate">
          {sessionTitle || 'Interview'}
        </h3>
        <div className={`flex items-center gap-1.5 mt-1 text-xs ${statusColors[sessionStatus] || 'text-text-muted'}`}>
          <Circle className="w-2 h-2 fill-current" />
          {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
        </div>
      </div>

      {/* Candidate invite link */}
      {isInterviewer && candidateJoinUrl && sessionStatus !== 'completed' && (
        <div className="p-4 border-b border-border">
          <span className="text-xs text-text-muted block mb-2">Candidate Invite Link</span>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border text-xs font-mono text-accent-glow transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{copied ? 'Copied!' : 'Copy invite link'}</span>
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Question Panel */}
        <QuestionPanel
          sessionId={sessionId}
          accessToken={accessToken}
          currentQuestionId={currentQuestionId}
          attachedQuestion={attachedQuestion}
          isInterviewer={isInterviewer}
          language={language}
          onQuestionSelected={onQuestionSelected}
        />

        {/* Telemetry dashboard — interviewer only */}
        {isInterviewer && sessionStatus === 'active' && (
          <TelemetryDashboard sessionId={sessionId} />
        )}

        {/* Interviewer permission controls */}
        {isInterviewer && (
          <InterviewerControls
            sessionId={sessionId}
            accessToken={accessToken}
            permissions={permissions}
            onPermissionsChanged={onPermissionsChanged || (() => {})}
          />
        )}

        {/* Participants list */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-text-muted" />
            <span className="text-xs font-medium text-text-secondary">
              Participants ({participants.length})
            </span>
          </div>
          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-card/50"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    p.role === 'interviewer'
                      ? 'bg-accent/20 text-accent-glow'
                      : p.role === 'candidate'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-bg-card-hover text-text-muted'
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-text-muted capitalize">{p.role}</div>
                </div>
                {p.joinedAt && (
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session controls */}
      {isInterviewer && (
        <div className="p-4 border-t border-border">
          {sessionStatus === 'created' || sessionStatus === 'waiting' ? (
            <Button
              className="w-full"
              size="sm"
              onClick={onStartSession}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Start Interview
            </Button>
          ) : sessionStatus === 'active' ? (
            <Button
              variant="secondary"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              size="sm"
              onClick={onEndSession}
            >
              <StopCircle className="w-4 h-4 mr-1.5" />
              End Interview
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
