import { useState, useCallback } from 'react';
import {
  Shield,
  Clipboard,
  Bot,
  Play,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { SessionPermissions } from '@interviewos/shared';
import { api } from '@/lib/api';

interface InterviewerControlsProps {
  sessionId: string;
  accessToken: string;
  permissions: SessionPermissions;
  onPermissionsChanged: (permissions: SessionPermissions) => void;
}

interface ToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Toggle({ label, description, icon, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
        checked
          ? 'border-accent/30 bg-accent/5'
          : 'border-border bg-bg-card/50 opacity-70'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-bg-card-hover cursor-pointer'}`}
    >
      <div className={`mt-0.5 ${checked ? 'text-accent-glow' : 'text-text-muted'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-text-muted mt-0.5">{description}</div>
      </div>
      <div
        className={`w-9 h-5 rounded-full flex items-center transition-colors shrink-0 mt-0.5 ${
          checked ? 'bg-accent' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

export default function InterviewerControls({
  sessionId,
  accessToken,
  permissions,
  onPermissionsChanged,
}: InterviewerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [updating, setUpdating] = useState(false);

  const handleToggle = useCallback(
    async (key: keyof SessionPermissions, value: boolean) => {
      if (updating) return;

      const newPermissions = { ...permissions, [key]: value };
      // Optimistic update
      onPermissionsChanged(newPermissions);

      setUpdating(true);
      try {
        await api(`/api/sessions/${sessionId}/permissions`, {
          method: 'PATCH',
          body: { [key]: value },
          token: accessToken,
        });
      } catch (err) {
        // Revert on error
        onPermissionsChanged(permissions);
        console.error('[Controls] Permission update failed:', err);
      } finally {
        setUpdating(false);
      }
    },
    [sessionId, accessToken, permissions, onPermissionsChanged, updating],
  );

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-bg-card-hover transition-colors"
      >
        <Shield className="w-4 h-4 text-accent-glow" />
        <span className="text-xs font-semibold flex-1 text-left">Candidate Permissions</span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          <Toggle
            label="Autocomplete"
            description="Allow IntelliSense & code suggestions"
            icon={<Sparkles className="w-4 h-4" />}
            checked={permissions.allowAutocomplete}
            onChange={(v) => handleToggle('allowAutocomplete', v)}
            disabled={updating}
          />
          <Toggle
            label="Paste"
            description="Allow clipboard paste into editor"
            icon={<Clipboard className="w-4 h-4" />}
            checked={permissions.allowPaste}
            onChange={(v) => handleToggle('allowPaste', v)}
            disabled={updating}
          />
          <Toggle
            label="AI Assistance"
            description="Allow AI-powered code suggestions"
            icon={<Bot className="w-4 h-4" />}
            checked={permissions.allowAi}
            onChange={(v) => handleToggle('allowAi', v)}
            disabled={updating}
          />
          <Toggle
            label="Run Code"
            description="Allow compiling and executing code"
            icon={<Play className="w-4 h-4" />}
            checked={permissions.allowRunCode}
            onChange={(v) => handleToggle('allowRunCode', v)}
            disabled={updating}
          />
        </div>
      )}
    </div>
  );
}
