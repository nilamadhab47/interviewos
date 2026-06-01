import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Code2, Play, ChevronDown, Wifi, WifiOff, Video, VideoOff, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { LANGUAGES, getLanguageById } from '@interviewos/shared';
import type { SessionPermissions } from '@interviewos/shared';
import MonacoEditor, { type MonacoEditorHandle } from '@/components/editor/MonacoEditor';
import '@/components/editor/cursor-styles.css';
import OutputPanel from '@/components/session/OutputPanel';
import Sidebar from '@/components/session/Sidebar';
import VideoRoom from '@/components/video/VideoRoom';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useYjs } from '@/hooks/useYjs';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { getSocket } from '@/lib/socket';
import { api, ApiError } from '@/lib/api';
import { useSessionSocket } from '@/hooks/useSessionSocket';
import type { SessionQuestionPayload } from '@interviewos/shared';
import { fetchSessionQuestion } from '@/lib/sessionApi';
import type { Question } from '@/types/question';

type SessionLocationState = {
  scheduledQuestion?: Question;
};

interface CompileResult {
  stdout: string | null;
  stderr: string | null;
  status: string;
  exitCode: number | null;
  timeMs: number | null;
  memoryKb: number | null;
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const scheduledQuestion = (location.state as SessionLocationState | null)?.scheduledQuestion;
  const { user, accessToken, authMode } = useAuthStore();
  const { session, fetchSession, clearSession } = useSessionStore();
  const editorRef = useRef<MonacoEditorHandle>(null);

  const [language, setLanguage] = useState('javascript');
  const [attachedQuestion, setAttachedQuestion] = useState<Question | null>(
    scheduledQuestion ?? null,
  );
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [permissions, setPermissions] = useState<SessionPermissions>({
    allowAutocomplete: true,
    allowPaste: true,
    allowAi: false,
    allowRunCode: true,
  });

  const myParticipant = session?.participants?.find(
    (p) => p.userId === user?.id || p.id === user?.id,
  );
  const participantRole =
    myParticipant?.role ?? (authMode === 'session' ? 'candidate' : 'interviewer');

  const yjsState = useYjs({
    roomId: id || '',
    userName: user?.name || user?.email || 'Anonymous',
    userRole: participantRole,
  });

  useSessionSocket(id, accessToken ?? undefined);

  useEffect(() => {
    if (!id || !accessToken) return;
    fetchSession(id, accessToken);
  }, [id, accessToken, fetchSession]);

  useEffect(() => {
    return () => clearSession();
  }, [clearSession]);

  useEffect(() => {
    if (scheduledQuestion) {
      setAttachedQuestion(scheduledQuestion);
    }
  }, [scheduledQuestion]);

  useEffect(() => {
    if (session) {
      if (session.language) setLanguage(session.language);
      if (session.permissions) setPermissions(session.permissions);
    }
  }, [session]);

  useEffect(() => {
    if (!id || !accessToken) return;

    if (!session?.questionId) {
      if (!scheduledQuestion) {
        setAttachedQuestion(null);
      }
      return;
    }

    let cancelled = false;

    fetchSessionQuestion(id, accessToken).then((question) => {
      if (!cancelled) {
        setAttachedQuestion(question);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, session?.questionId, accessToken, scheduledQuestion]);

  const currentLang = getLanguageById(language);
  const isInterviewer = participantRole === 'interviewer';

  const { trackCompile } = useTelemetry({
    sessionId: id || '',
    participantId: myParticipant?.id || '',
    accessToken: accessToken || '',
    enabled: !isInterviewer && !!myParticipant?.id && !!id,
  });

  useAntiCheat({ permissions });

  const handleQuestionSelected = useCallback((question: Question) => {
    setAttachedQuestion(question);
  }, []);

  useEffect(() => {
    if (!id) return;

    const socket = getSocket();

    const onQuestionChanged = (payload: SessionQuestionPayload) => {
      if (payload.language) {
        setLanguage(payload.language);
      }

      if (!payload.question) {
        setAttachedQuestion(null);
        return;
      }

      setAttachedQuestion(payload.question as Question);
    };

    socket.on('session:question_changed', onQuestionChanged);
    return () => {
      socket.off('session:question_changed', onQuestionChanged);
    };
  }, [id]);

  const getCurrentCode = useCallback((): string => {
    const fromEditor = editorRef.current?.getValue();
    if (fromEditor?.trim()) return fromEditor;
    return yjsState?.ytext?.toString() || '';
  }, [yjsState?.ytext]);

  const handleCompile = useCallback(async () => {
    if (!id || !accessToken || isCompiling) return;
    if (!permissions.allowRunCode) return;

    const lang = getLanguageById(language);
    if (!lang) return;

    const code = getCurrentCode();
    if (!code.trim()) {
      setCompileResult({
        stdout: null,
        stderr: 'Editor is empty. Type some code before running.',
        status: 'Error',
        exitCode: 1,
        timeMs: null,
        memoryKb: null,
      });
      return;
    }

    setIsCompiling(true);
    setCompileResult(null);

    try {
      const result = await api<CompileResult>('/api/compile', {
        method: 'POST',
        body: { sessionId: id, code, languageId: lang.judge0Id },
        token: accessToken,
      });
      setCompileResult(result);
      if (!isInterviewer) {
        trackCompile(language, code.length, result.status);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Compilation failed';
      setCompileResult({
        stdout: null,
        stderr: message,
        status: 'Error',
        exitCode: 1,
        timeMs: null,
        memoryKb: null,
      });
    } finally {
      setIsCompiling(false);
    }
  }, [
    id,
    accessToken,
    language,
    isCompiling,
    getCurrentCode,
    permissions.allowRunCode,
    trackCompile,
    isInterviewer,
  ]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompile();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCompile]);

  const candidateParticipant = session?.participants?.find((p) => p.role === 'candidate');
  const candidateJoinUrl = candidateParticipant?.token
    ? `/join/${candidateParticipant.token}`
    : null;

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary/50 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold hidden sm:inline">
              Interview<span className="text-accent-glow">OS</span>
            </span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm hover:bg-bg-card-hover transition-colors"
            >
              {currentLang?.name || language}
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 mt-1 w-44 glass rounded-lg border border-border shadow-xl z-50 py-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setLanguage(lang.id);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-card-hover transition-colors ${
                      lang.id === language ? 'text-accent-glow' : 'text-text-secondary'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {yjsState?.isConnected ? (
              <Wifi className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className="text-xs text-text-muted">
              {yjsState?.isConnected
                ? yjsState.isSynced
                  ? 'Live'
                  : 'Syncing'
                : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVideo(!showVideo)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showVideo
                ? 'bg-accent/10 border-accent/30 text-accent-glow'
                : 'bg-bg-card border-border text-text-secondary hover:bg-bg-card-hover'
            }`}
            title={showVideo ? 'Hide video' : 'Show video'}
          >
            {showVideo ? (
              <Video className="w-3.5 h-3.5" />
            ) : (
              <VideoOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Video</span>
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-sm transition-colors ${
              showSidebar
                ? 'bg-bg-card border-border text-text-secondary'
                : 'bg-bg-card border-border text-text-secondary hover:bg-bg-card-hover'
            }`}
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {showSidebar ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
          </button>

          <span className="text-xs text-text-muted hidden sm:inline">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
          </span>
          <Button
            size="sm"
            onClick={handleCompile}
            disabled={isCompiling || !permissions.allowRunCode}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {isCompiling ? 'Running...' : 'Run Code'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <MonacoEditor
              ref={editorRef}
              language={currentLang?.monacoId || 'javascript'}
              yjsState={yjsState}
            />
          </div>

          <div className="h-48 shrink-0 border-t border-border">
            <OutputPanel result={compileResult} isCompiling={isCompiling} />
          </div>
        </div>

        {(showVideo || showSidebar) && (
          <div className="w-80 shrink-0 border-l border-border flex flex-col bg-bg-secondary/30">
            {showVideo && id && accessToken && (
              <div className="h-80 shrink-0 border-b border-border p-1.5">
                <VideoRoom sessionId={id} accessToken={accessToken} layout="sidebar" />
              </div>
            )}

            {showSidebar && id && accessToken && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <Sidebar
                  participants={session?.participants || []}
                  sessionTitle={session?.title ?? undefined}
                  sessionStatus={session?.status || 'created'}
                  sessionId={id}
                  accessToken={accessToken}
                  candidateJoinUrl={candidateJoinUrl}
                  isInterviewer={isInterviewer}
                  currentQuestionId={session?.questionId}
                  attachedQuestion={attachedQuestion}
                  language={language}
                  permissions={permissions}
                  onPermissionsChanged={setPermissions}
                  onQuestionSelected={handleQuestionSelected}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
